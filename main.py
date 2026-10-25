import os
import io
import json
import threading
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Query, Path, Depends, status, BackgroundTasks
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv

import jwt
import bcrypt

# Set headless backend for Matplotlib before importing pyplot
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Load environment variables
load_dotenv()

# ---------------------------------------------------------------------------
# Configuration & Secrets
# ---------------------------------------------------------------------------
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "buisease-dev-secret-key-3b8f1a2c9d4e5f60718293a4b5c6d7e8")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
RESET_TOKEN_EXPIRE_MINUTES = 30

DB_PATH = os.path.abspath("project.json")
db_lock = threading.Lock()
matplotlib_lock = threading.Lock()

# ---------------------------------------------------------------------------
# FastAPI Initialization
# ---------------------------------------------------------------------------
api = FastAPI(
    title="BuisEase API",
    description="Streamlining Business Operations & Market Analytics",
    version="2.0.0",
)

# CORS configuration
cors_origins_raw = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
)
allowed_origins = [orig.strip() for orig in cors_origins_raw.split(",") if orig.strip()]

api.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login", auto_error=False)

# ---------------------------------------------------------------------------
# Database Layer (Robust JSON Flat-File Persistence)
# ---------------------------------------------------------------------------
def read_db() -> Dict[str, Any]:
    """Reads the JSON database safely, handling missing or corrupted files,

    and performs transparent one-time password hashing migration for legacy plaintext users.
    """
    default_structure = {
        "users": [],
        "competitor_analysis": {"food_delivery": {}},
        "study_tasks": [],
    }

    with db_lock:
        if not os.path.exists(DB_PATH):
            write_db_unlocked(default_structure)
            return default_structure

        try:
            with open(DB_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            # If corrupted, preserve a backup and return existing or empty
            backup_corrupted = f"{DB_PATH}.corrupted.{int(datetime.now().timestamp())}"
            try:
                os.replace(DB_PATH, backup_corrupted)
            except OSError:
                pass
            data = default_structure
            write_db_unlocked(data)
            return data

        # Ensure required top-level collections exist
        changed = False
        if "users" not in data or not isinstance(data["users"], list):
            data["users"] = []
            changed = True
        if "competitor_analysis" not in data or not isinstance(data["competitor_analysis"], dict):
            data["competitor_analysis"] = {"food_delivery": {}}
            changed = True
        if "study_tasks" not in data or not isinstance(data["study_tasks"], list):
            data["study_tasks"] = []
            changed = True

        # Safe transparent password migration for existing plaintext accounts
        for user in data["users"]:
            if "password" in user and "password_hash" not in user:
                plain = str(user.pop("password"))
                salt = bcrypt.gensalt()
                hashed = bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")
                user["password_hash"] = hashed
                changed = True

        if changed:
            write_db_unlocked(data)

        return data


def write_db_unlocked(data: Dict[str, Any]) -> None:
    """Atomic write to disk using temp file + replace to prevent corruption."""
    temp_file = f"{DB_PATH}.tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
    os.replace(temp_file, DB_PATH)


def write_db(data: Dict[str, Any]) -> None:
    """Thread-safe public atomic write wrapper."""
    with db_lock:
        write_db_unlocked(data)


def load_data() -> Dict[str, Any]:
    """Backward-compatible helper alias for read_db."""
    return read_db()


# ---------------------------------------------------------------------------
# Password Hashing & Security Helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, stored_hash_or_plain: Optional[str]) -> bool:
    if not stored_hash_or_plain:
        return False
    
    # 1. Bcrypt verification
    if stored_hash_or_plain.startswith(("$2b$", "$2a$", "$2y$")):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), stored_hash_or_plain.encode("utf-8"))
        except Exception:
            return False

    # 2. Legacy SHA-256 fallback (64 hex characters)
    if len(stored_hash_or_plain) == 64 and all(c in "0123456789abcdefABCDEF" for c in stored_hash_or_plain):
        sha = hashlib.sha256(plain_password.encode("utf-8")).hexdigest().lower()
        return sha == stored_hash_or_plain.lower()

    # 3. Legacy plaintext fallback
    return plain_password == stored_hash_or_plain


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_reset_token(email: str, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": username,
        "email": email,
        "type": "password_reset",
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_reset_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token type.")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password reset link has expired.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid password reset token.")


def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        if not username or token_type != "access":
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    db_data = read_db()
    for user in db_data.get("users", []):
        if user.get("username", "").lower() == username.lower():
            return user

    raise credentials_exception


# ---------------------------------------------------------------------------
# Pydantic Request & Response Models
# ---------------------------------------------------------------------------
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class LogoutRequest(BaseModel):
    username: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
    username: Optional[str] = None


class UpdateUsernameRequest(BaseModel):
    new_username: str = Field(..., min_length=3, max_length=20)
    password: str
    current_username: Optional[str] = None


class RecoverCredentialsRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    username: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # "Pending" or "Completed"


class TaskStatsResponse(BaseModel):
    username: str
    total_tasks: int
    pending_tasks: int
    completed_tasks: int
    completion_percentage: float


# ---------------------------------------------------------------------------
# Root, Health & Informational Endpoints
# ---------------------------------------------------------------------------
@api.get("/", tags=["General"])
def read_root():
    return {
        "message": "BUIS-EASE THAT MAKES YOUR BUSINESS EASY",
        "app": "BuisEase API",
        "status": "healthy",
        "version": "2.0.0",
        "docs": "/docs",
    }


@api.get("/health", tags=["General"])
def health_check():
    db = read_db()
    return {
        "status": "healthy",
        "users_count": len(db.get("users", [])),
        "tasks_count": len(db.get("study_tasks", [])),
    }


@api.get("/about", tags=["General"])
def about():
    return {
        "message": "MAKES YOUR BUSINESS EASY",
        "app": "BuisEase",
        "description": "Streamlining Business Operations & Market Analytics with Task Workspaces & Competitor Intelligence.",
    }


# ---------------------------------------------------------------------------
# Authentication Endpoints
# ---------------------------------------------------------------------------
@api.post("/register", status_code=status.HTTP_201_CREATED, tags=["Auth"])
def register_user(user: UserRegister):
    db_data = read_db()
    users_list = db_data.get("users", [])

    clean_username = user.username.strip()
    clean_email = user.email.strip().lower()

    # Reject duplicate username or email
    for existing in users_list:
        if existing.get("username", "").lower() == clean_username.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is already taken.")
        if existing.get("email", "").lower() == clean_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")

    # Securely hash password using bcrypt
    hashed = hash_password(user.password)

    new_user = {
        "username": clean_username,
        "email": clean_email,
        "password_hash": hashed,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    users_list.append(new_user)
    db_data["users"] = users_list
    write_db(db_data)

    access_token = create_access_token(data={"sub": clean_username})

    return {
        "message": "User registered successfully!",
        "username": clean_username,
        "email": clean_email,
        "access_token": access_token,
        "token_type": "bearer",
        "authenticated": True,
    }


@api.post("/login", tags=["Auth"])
def login_user(user: UserLogin):
    db_data = read_db()
    users_list = db_data.get("users", [])

    clean_username = user.username.strip()
    matched_user = None

    for existing in users_list:
        if existing.get("username", "").lower() == clean_username.lower():
            matched_user = existing
            break

    if not matched_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stored_hash = matched_user.get("password_hash") or matched_user.get("password")

    if not verify_password(user.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # If the user was still using a legacy SHA256 or plaintext password, transparently upgrade to bcrypt
    if stored_hash and not stored_hash.startswith(("$2b$", "$2a$", "$2y$")):
        matched_user["password_hash"] = hash_password(user.password)
        if "password" in matched_user:
            del matched_user["password"]
        db_data["users"] = users_list
        write_db(db_data)

    access_token = create_access_token(data={"sub": matched_user["username"]})

    return {
        "message": "Login successful!",
        "username": matched_user["username"],
        "email": matched_user.get("email"),
        "access_token": access_token,
        "token_type": "bearer",
        "authenticated": True,
    }


@api.post("/logout", status_code=status.HTTP_200_OK, tags=["Auth"])
def logout_user(request: LogoutRequest = LogoutRequest()):
    username_str = request.username if request.username else "User"
    return {
        "message": f"{username_str} logged out successfully.",
        "session_cleared": True,
    }


@api.get("/users/me", tags=["Auth"])
def get_user_profile(current_user: dict = Depends(get_current_user)):
    db = read_db()
    all_tasks = db.get("study_tasks", [])
    user_tasks = [t for t in all_tasks if t.get("username", "").lower() == current_user["username"].lower()]

    return {
        "username": current_user["username"],
        "email": current_user.get("email"),
        "tasks_count": len(user_tasks),
    }


# ---------------------------------------------------------------------------
# Account Management Endpoints
# ---------------------------------------------------------------------------
@api.put("/users/change-password", status_code=status.HTTP_200_OK, tags=["Account"])
def change_user_password(request: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    db_data = read_db()
    users_list = db_data.get("users", [])

    # Find target user in DB
    target = None
    for u in users_list:
        if u.get("username", "").lower() == current_user["username"].lower():
            target = u
            break

    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    stored_hash = target.get("password_hash") or target.get("password")

    # Verify current password
    if not verify_password(request.current_password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect current password. Verification failed.",
        )

    if request.new_password == request.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as the current password.",
        )

    # Securely hash and update
    target["password_hash"] = hash_password(request.new_password)
    if "password" in target:
        del target["password"]

    db_data["users"] = users_list
    write_db(db_data)

    return {"message": f"Password for user '{current_user['username']}' has been updated successfully!"}


@api.put("/users/update-username", status_code=status.HTTP_200_OK, tags=["Account"])
def update_username(request: UpdateUsernameRequest, current_user: dict = Depends(get_current_user)):
    db_data = read_db()
    users_list = db_data.get("users", [])
    all_tasks = db_data.get("study_tasks", [])

    target_user = None
    for u in users_list:
        if u.get("username", "").lower() == current_user["username"].lower():
            target_user = u
            break

    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    stored_hash = target_user.get("password_hash") or target_user.get("password")
    if not verify_password(request.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identity verification failed. Incorrect password.",
        )

    new_clean = request.new_username.strip()
    if new_clean.lower() != current_user["username"].lower():
        for u in users_list:
            if u.get("username", "").lower() == new_clean.lower():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The new username is already taken.")

    old_username = target_user["username"]
    target_user["username"] = new_clean

    # Sync linked tasks
    updated_count = 0
    for task in all_tasks:
        if task.get("username", "").lower() == old_username.lower():
            task["username"] = new_clean
            updated_count += 1

    db_data["users"] = users_list
    db_data["study_tasks"] = all_tasks
    write_db(db_data)

    # Issue updated access token for the new username
    new_token = create_access_token(data={"sub": new_clean})

    return {
        "message": "Username updated successfully!",
        "old_username": old_username,
        "new_username": new_clean,
        "linked_tasks_updated": updated_count,
        "access_token": new_token,
        "token_type": "bearer",
    }


# ---------------------------------------------------------------------------
# Account Recovery & Password Reset
# ---------------------------------------------------------------------------
@api.post("/users/recover-credentials", status_code=status.HTTP_200_OK, tags=["Account"])
def recover_credentials(request: RecoverCredentialsRequest, background_tasks: BackgroundTasks):
    db_data = read_db()
    users_list = db_data.get("users", [])

    target_user = None
    for u in users_list:
        if u.get("email", "").lower() == request.email.strip().lower():
            target_user = u
            break

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account is registered with this email address.",
        )

    username = target_user["username"]
    reset_token = create_reset_token(email=target_user["email"], username=username)

    # Check if real SMTP credentials are provided in environment
    mail_username = os.getenv("MAIL_USERNAME", "your_email@gmail.com")
    mail_password = os.getenv("MAIL_PASSWORD", "your_app_password")

    smtp_configured = (
        mail_username != "your_email@gmail.com"
        and mail_password != "your_app_password"
        and bool(mail_username)
        and bool(mail_password)
    )

    if smtp_configured:
        try:
            from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
            mail_conf = ConnectionConfig(
                MAIL_USERNAME=mail_username,
                MAIL_PASSWORD=mail_password,
                MAIL_FROM=os.getenv("MAIL_FROM", mail_username),
                MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
                MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
                MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "BuisEase Support"),
                MAIL_STARTTLS=True,
                MAIL_SSL_TLS=False,
                USE_CREDENTIALS=True,
                VALIDATE_CERTS=True,
            )
            reset_url = f"http://localhost:5173/reset-password?token={reset_token}"
            email_body = f"""Hello {username},

You requested a password reset for your BuisEase account.
Click or paste this link into your browser to reset your password (valid for 30 minutes):
{reset_url}

If you did not make this request, please ignore this email.

Best regards,
BuisEase Support Team"""
            message = MessageSchema(
                subject="BuisEase Password Reset Request",
                recipients=[request.email],
                body=email_body,
                subtype=MessageType.plain,
            )
            fm = FastMail(mail_conf)
            background_tasks.add_task(fm.send_message, message)

            return {
                "message": "Password reset link dispatched to your registered email address.",
                "recipient": request.email,
                "email_sent": True,
            }
        except Exception as e:
            # Fallback if SMTP connection fails
            return {
                "message": "Password reset token generated. (SMTP delivery encountered an error; reset token provided for development).",
                "recipient": request.email,
                "reset_token": reset_token,
                "email_sent": False,
            }

    # Safe fallback when SMTP is not yet configured locally:
    return {
        "message": "Password reset token generated. (Local development mode: SMTP credentials are not configured in .env).",
        "recipient": request.email,
        "reset_token": reset_token,
        "reset_link": f"/reset-password?token={reset_token}",
        "email_sent": False,
    }


@api.post("/users/reset-password", status_code=status.HTTP_200_OK, tags=["Account"])
def reset_password(request: ResetPasswordRequest):
    payload = verify_reset_token(request.token)
    username = payload.get("sub")

    db_data = read_db()
    users_list = db_data.get("users", [])

    target_user = None
    for u in users_list:
        if u.get("username", "").lower() == username.lower():
            target_user = u
            break

    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    target_user["password_hash"] = hash_password(request.new_password)
    if "password" in target_user:
        del target_user["password"]

    db_data["users"] = users_list
    write_db(db_data)

    return {"message": "Password has been successfully reset! You can now log in with your new password."}


# ---------------------------------------------------------------------------
# Task Management Endpoints (Secured & User-Scoped)
# ---------------------------------------------------------------------------
@api.get("/tasks", tags=["Tasks"])
def get_tasks(
    username: Optional[str] = Query(None, description="Optional username filter"),
    current_user: dict = Depends(get_current_user),
):
    db_data = read_db()
    all_tasks = db_data.get("study_tasks", [])

    # User isolation: Strictly scoped to the authenticated user
    target_username = current_user["username"]

    # If username query was passed, ensure caller cannot query someone else's tasks
    if username and username.lower() != target_username.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot view tasks belonging to another user.",
        )

    user_tasks = [t for t in all_tasks if t.get("username", "").lower() == target_username.lower()]

    return {
        "username": target_username,
        "total_tasks": len(user_tasks),
        "tasks": user_tasks,
    }


@api.get("/tasks/stats", response_model=TaskStatsResponse, tags=["Tasks"])
def get_task_statistics(
    username: Optional[str] = Query(None, description="Optional username parameter"),
    current_user: dict = Depends(get_current_user),
):
    target_username = current_user["username"]
    if username and username.lower() != target_username.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot view stats belonging to another user.",
        )

    db_data = read_db()
    all_tasks = db_data.get("study_tasks", [])

    user_tasks = [t for t in all_tasks if t.get("username", "").lower() == target_username.lower()]

    total = len(user_tasks)
    completed = sum(1 for t in user_tasks if str(t.get("status", "")).strip().lower() == "completed")
    pending = total - completed
    pct = round((completed / total) * 100, 2) if total > 0 else 0.0

    return {
        "username": target_username,
        "total_tasks": total,
        "pending_tasks": pending,
        "completed_tasks": completed,
        "completion_percentage": pct,
    }


@api.get("/tasks/{task_id}", tags=["Tasks"])
def get_single_task(
    task_id: int = Path(..., description="The ID of the task to retrieve", ge=1),
    current_user: dict = Depends(get_current_user),
):
    db_data = read_db()
    all_tasks = db_data.get("study_tasks", [])

    for task in all_tasks:
        if task.get("task_id") == task_id:
            # Check ownership
            if task.get("username", "").lower() != current_user["username"].lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You do not own this task.",
                )
            return task

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with ID {task_id} not found.")


@api.post("/tasks", status_code=status.HTTP_201_CREATED, tags=["Tasks"])
def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    db_data = read_db()
    all_tasks = db_data.get("study_tasks", [])

    # Auto-increment task_id based on max existing numeric task_id
    existing_ids = [t.get("task_id") for t in all_tasks if isinstance(t.get("task_id"), int)]
    new_id = (max(existing_ids) + 1) if existing_ids else 1

    new_task = {
        "task_id": new_id,
        "username": current_user["username"],  # Explicitly bound to authenticated caller
        "title": task.title.strip(),
        "description": task.description.strip(),
        "status": "Pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    all_tasks.append(new_task)
    db_data["study_tasks"] = all_tasks
    write_db(db_data)

    return {"message": "Task created successfully!", "task": new_task}


@api.put("/tasks/{task_id}", tags=["Tasks"])
def update_task(
    task_id: int = Path(..., ge=1),
    task_update: TaskUpdate = None,
    current_user: dict = Depends(get_current_user),
):
    db_data = read_db()
    all_tasks = db_data.get("study_tasks", [])

    target_task = None
    for t in all_tasks:
        if t.get("task_id") == task_id:
            target_task = t
            break

    if not target_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with ID {task_id} not found.")

    if target_task.get("username", "").lower() != current_user["username"].lower():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: You do not own this task.")

    if task_update:
        if task_update.title is not None:
            target_task["title"] = task_update.title.strip()
        if task_update.description is not None:
            target_task["description"] = task_update.description.strip()
        if task_update.status is not None:
            formatted_status = task_update.status.strip().title()
            if formatted_status not in ["Pending", "Completed"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Status must be either 'Pending' or 'Completed'.",
                )
            target_task["status"] = formatted_status

    db_data["study_tasks"] = all_tasks
    write_db(db_data)

    return {"message": f"Task {task_id} updated successfully!", "task": target_task}


@api.delete("/tasks/completed", status_code=status.HTTP_200_OK, tags=["Tasks"])
def clear_completed_tasks(
    username: Optional[str] = Query(None, description="Optional username parameter"),
    current_user: dict = Depends(get_current_user),
):
    target_username = current_user["username"]
    db_data = read_db()
    all_tasks = db_data.get("study_tasks", [])

    initial_len = len(all_tasks)
    retained_tasks = [
        t
        for t in all_tasks
        if t.get("username", "").lower() != target_username.lower()
        or str(t.get("status", "")).strip().lower() != "completed"
    ]
    deleted_count = initial_len - len(retained_tasks)

    db_data["study_tasks"] = retained_tasks
    write_db(db_data)

    # Safe response fixing former status_code=44 bug
    return {
        "message": f"Successfully cleared completed tasks for user '{target_username}'.",
        "tasks_removed_count": deleted_count,
    }


@api.delete("/tasks/{task_id}", tags=["Tasks"])
def delete_task(
    task_id: int = Path(..., ge=1),
    current_user: dict = Depends(get_current_user),
):
    db_data = read_db()
    all_tasks = db_data.get("study_tasks", [])

    target_task = None
    for t in all_tasks:
        if t.get("task_id") == task_id:
            target_task = t
            break

    if not target_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task with ID {task_id} not found.")

    if target_task.get("username", "").lower() != current_user["username"].lower():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: You do not own this task.")

    updated_tasks = [t for t in all_tasks if t.get("task_id") != task_id]
    db_data["study_tasks"] = updated_tasks
    write_db(db_data)

    return {"message": f"Task {task_id} has been permanently deleted successfully!"}


@api.get("/tasks/stats/bar-chart", tags=["Tasks"])
def get_task_bar_chart(
    username: Optional[str] = Query(None),
    token: Optional[str] = Query(None, description="Auth token for img src tags"),
    current_user_dep: Optional[dict] = Depends(lambda: None),
):
    # Support token in query for direct <img src="..."> embeds
    target_username = None
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            target_username = payload.get("sub")
        except jwt.PyJWTError:
            pass

    if not target_username and username:
        target_username = username

    if not target_username:
        target_username = "User"

    db_data = read_db()
    all_tasks = db_data.get("study_tasks", [])

    user_tasks = [t for t in all_tasks if t.get("username", "").lower() == target_username.lower()]

    total = len(user_tasks)
    completed = sum(1 for t in user_tasks if str(t.get("status", "")).strip().lower() == "completed")
    pending = total - completed

    categories = ["Pending Tasks", "Completed Tasks", "Total Tasks"]
    counts = [pending, completed, total]
    bar_colors = ["#e74c3c", "#2ecc71", "#3498db"]

    with matplotlib_lock:
        fig, ax = plt.subplots(figsize=(7, 4.5))
        try:
            bars = ax.bar(categories, counts, color=bar_colors, width=0.45, edgecolor="#2c3e50", linewidth=0.8)
            for bar in bars:
                height = bar.get_height()
                ax.annotate(
                    f"{int(height)}",
                    xy=(bar.get_x() + bar.get_width() / 2, height),
                    xytext=(0, 4),
                    textcoords="offset points",
                    ha="center",
                    va="bottom",
                    fontweight="bold",
                    fontsize=11,
                )
            ax.set_ylabel("Number of Tasks", fontsize=11, fontweight="bold")
            ax.set_title(f"Task Metrics Overview ({target_username})", fontsize=13, fontweight="bold", pad=15)
            ax.grid(axis="y", linestyle="--", alpha=0.5)
            ax.set_ylim(0, max(counts) + (max(counts) * 0.25 if max(counts) > 0 else 5))
            fig.tight_layout()

            buf = io.BytesIO()
            fig.savefig(buf, format="png", dpi=120)
            buf.seek(0)
            return Response(content=buf.getvalue(), media_type="image/png")
        finally:
            plt.close(fig)


# ---------------------------------------------------------------------------
# Competitor Analysis Endpoints
# ---------------------------------------------------------------------------
def get_competitor_store() -> dict:
    db = read_db()
    comp_analysis = db.get("competitor_analysis", {})
    return comp_analysis.get("food_delivery", comp_analysis)


@api.get("/analysis/food-delivery", tags=["Competitor Analysis"])
def get_food_delivery_insights():
    comp_data = get_competitor_store()
    if not comp_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food delivery analysis data not found.")

    return {
        "category": "food_delivery",
        "competitors": comp_data,
    }


@api.get("/competitor-analysis/food-delivery/zomato", tags=["Competitor Analysis"])
def get_zomato_analysis():
    comp_data = get_competitor_store()
    zomato_data = comp_data.get("Zomato") or comp_data.get("zomato")
    if not zomato_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data for 'Zomato' not found.")

    return {
        "app_name": "Zomato",
        "category": "food_delivery",
        "good_features": zomato_data.get("good_features", []),
        "bad_features": zomato_data.get("bad_features", []),
        "unavailable_features": zomato_data.get("unavailable_features", []),
    }


@api.get("/competitor-analysis/food-delivery/swiggy", tags=["Competitor Analysis"])
def get_swiggy_analysis():
    comp_data = get_competitor_store()
    swiggy_data = comp_data.get("Swiggy") or comp_data.get("swiggy")
    if not swiggy_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data for 'Swiggy' not found.")

    return {
        "app_name": "Swiggy",
        "category": "food_delivery",
        "good_features": swiggy_data.get("good_features", []),
        "bad_features": swiggy_data.get("bad_features", []),
        "unavailable_features": swiggy_data.get("unavailable_features", []),
    }


def generate_single_app_chart_bytes(app_name: str, primary_color: str) -> bytes:
    comp_data = get_competitor_store()
    app_info = comp_data.get(app_name)
    if not app_info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Data for '{app_name}' not found.")

    likes_count = len(app_info.get("good_features", []))
    dislikes_count = len(app_info.get("bad_features", []))

    categories = ["Likes\n(Good Features)", "Dislikes\n(Bad Features)"]
    values = [likes_count, dislikes_count]
    colors = ["#2ecc71", "#e74c3c"]

    with matplotlib_lock:
        fig, ax = plt.subplots(figsize=(6, 4.5))
        try:
            bars = ax.bar(categories, values, color=colors, width=0.42, edgecolor="#2c3e50", linewidth=0.8)
            ax.set_title(f"{app_name}: Likes vs Dislikes", fontsize=13, fontweight="bold", color=primary_color, pad=12)
            ax.set_ylabel("Number of Extracted Reviews", fontsize=11)
            ax.set_ylim(0, max(values) + 3 if max(values) > 0 else 5)
            ax.grid(axis="y", linestyle="--", alpha=0.6)

            for bar in bars:
                h = bar.get_height()
                ax.annotate(
                    f"{int(h)}",
                    xy=(bar.get_x() + bar.get_width() / 2, h),
                    xytext=(0, 4),
                    textcoords="offset points",
                    ha="center",
                    va="bottom",
                    fontweight="bold",
                    fontsize=11,
                )
            fig.tight_layout()

            buf = io.BytesIO()
            fig.savefig(buf, format="png", dpi=120)
            buf.seek(0)
            return buf.getvalue()
        finally:
            plt.close(fig)


@api.get("/competitor-analysis/food-delivery/zomato/chart", tags=["Competitor Analysis"])
def get_zomato_chart():
    image_bytes = generate_single_app_chart_bytes(app_name="Zomato", primary_color="#CB202D")
    return Response(content=image_bytes, media_type="image/png")


@api.get("/competitor-analysis/food-delivery/swiggy/chart", tags=["Competitor Analysis"])
def get_swiggy_chart():
    image_bytes = generate_single_app_chart_bytes(app_name="Swiggy", primary_color="#FC8019")
    return Response(content=image_bytes, media_type="image/png")


@api.get("/competitor-analysis/food-delivery/charts", tags=["Competitor Analysis"])
def get_food_delivery_charts():
    comp_data = get_competitor_store()
    if not comp_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No food delivery competitor data found.")

    zomato = comp_data.get("Zomato", {})
    swiggy = comp_data.get("Swiggy", {})

    z_likes = len(zomato.get("good_features", []))
    z_dislikes = len(zomato.get("bad_features", []))
    s_likes = len(swiggy.get("good_features", []))
    s_dislikes = len(swiggy.get("bad_features", []))

    with matplotlib_lock:
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))
        try:
            categories = ["Likes\n(Good)", "Dislikes\n(Bad)"]
            colors = ["#2ecc71", "#e74c3c"]
            max_y = max([z_likes, z_dislikes, s_likes, s_dislikes, 5]) + 3

            # Zomato
            bars1 = ax1.bar(categories, [z_likes, z_dislikes], color=colors, width=0.45)
            ax1.set_title("Zomato: Likes vs Dislikes", fontsize=12, fontweight="bold", color="#CB202D")
            ax1.set_ylabel("Count of Reviews", fontsize=10)
            ax1.set_ylim(0, max_y)
            ax1.grid(axis="y", linestyle="--", alpha=0.6)
            for bar in bars1:
                h = bar.get_height()
                ax1.annotate(f"{int(h)}", xy=(bar.get_x() + bar.get_width() / 2, h), xytext=(0, 3),
                             textcoords="offset points", ha="center", va="bottom", fontweight="bold")

            # Swiggy
            bars2 = ax2.bar(categories, [s_likes, s_dislikes], color=colors, width=0.45)
            ax2.set_title("Swiggy: Likes vs Dislikes", fontsize=12, fontweight="bold", color="#FC8019")
            ax2.set_ylabel("Count of Reviews", fontsize=10)
            ax2.set_ylim(0, max_y)
            ax2.grid(axis="y", linestyle="--", alpha=0.6)
            for bar in bars2:
                h = bar.get_height()
                ax2.annotate(f"{int(h)}", xy=(bar.get_x() + bar.get_width() / 2, h), xytext=(0, 3),
                             textcoords="offset points", ha="center", va="bottom", fontweight="bold")

            fig.tight_layout()
            buf = io.BytesIO()
            fig.savefig(buf, format="png", dpi=120)
            buf.seek(0)
            return Response(content=buf.getvalue(), media_type="image/png")
        finally:
            plt.close(fig)
