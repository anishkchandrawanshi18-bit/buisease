import os
import sys
import json
import pytest

# Ensure root directory is in Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import api, read_db, write_db, hash_password, DB_PATH

client = TestClient(api)

# Test user credentials
TEST_USER = "test_tester_123"
TEST_EMAIL = "tester_123@buisease.com"
TEST_PASSWORD = "Password123!"

TEST_USER_2 = "other_user_456"
TEST_EMAIL_2 = "other_456@buisease.com"
TEST_PASSWORD_2 = "Password456!"

@pytest.fixture(scope="session", autouse=True)
def setup_teardown_test_data():
    # Setup: save current DB state
    db_backup = read_db()
    
    yield
    
    # Teardown: clean up test users and their tasks
    current = read_db()
    current["users"] = [
        u for u in current.get("users", [])
        if u.get("username") not in [TEST_USER, TEST_USER_2, "new_test_username"]
    ]
    current["study_tasks"] = [
        t for t in current.get("study_tasks", [])
        if t.get("username") not in [TEST_USER, TEST_USER_2, "new_test_username"]
    ]
    write_db(current)


def test_root_and_health():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "BUIS-EASE" in data["message"]
    assert data["status"] == "healthy"

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"

    about = client.get("/about")
    assert about.status_code == 200
    assert "BuisEase" in about.json()["app"]


def test_user_registration_and_duplicate_handling():
    # Clean up before testing
    db = read_db()
    db["users"] = [u for u in db["users"] if u.get("username") != TEST_USER]
    write_db(db)

    # Register successfully
    res = client.post("/register", json={
        "username": TEST_USER,
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert res.status_code == 201
    data = res.json()
    assert data["username"] == TEST_USER
    assert "access_token" in data
    assert data["authenticated"] is True

    # Duplicate username
    res_dup = client.post("/register", json={
        "username": TEST_USER,
        "email": "another@test.com",
        "password": TEST_PASSWORD
    })
    assert res_dup.status_code == 400
    assert "Username is already taken" in res_dup.json()["detail"]

    # Duplicate email
    res_dup_email = client.post("/register", json={
        "username": "unique_username_999",
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert res_dup_email.status_code == 400
    assert "Email is already registered" in res_dup_email.json()["detail"]


def test_user_login():
    # Valid login
    res = client.post("/login", json={
        "username": TEST_USER,
        "password": TEST_PASSWORD
    })
    assert res.status_code == 200
    data = res.json()
    assert data["authenticated"] is True
    assert "access_token" in data
    assert data["username"] == TEST_USER

    # Invalid password
    res_invalid = client.post("/login", json={
        "username": TEST_USER,
        "password": "WrongPassword999!"
    })
    assert res_invalid.status_code == 401


def test_authenticated_profile():
    # Login to get token
    login_res = client.post("/login", json={
        "username": TEST_USER,
        "password": TEST_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch profile
    profile_res = client.get("/users/me", headers=headers)
    assert profile_res.status_code == 200
    assert profile_res.json()["username"] == TEST_USER
    assert profile_res.json()["email"] == TEST_EMAIL


def test_task_crud_and_isolation():
    # User 1 login
    tok1 = client.post("/login", json={"username": TEST_USER, "password": TEST_PASSWORD}).json()["access_token"]
    headers1 = {"Authorization": f"Bearer {tok1}"}

    # User 2 register & login
    client.post("/register", json={"username": TEST_USER_2, "email": TEST_EMAIL_2, "password": TEST_PASSWORD_2})
    tok2 = client.post("/login", json={"username": TEST_USER_2, "password": TEST_PASSWORD_2}).json()["access_token"]
    headers2 = {"Authorization": f"Bearer {tok2}"}

    # 1. Create task for User 1
    create_res = client.post("/tasks", json={
        "title": "Build AI Model",
        "description": "Evaluate classification accuracy on reviews"
    }, headers=headers1)
    assert create_res.status_code == 201
    task_id = create_res.json()["task"]["task_id"]
    assert create_res.json()["task"]["username"] == TEST_USER
    assert create_res.json()["task"]["status"] == "Pending"

    # 2. User 1 gets their tasks
    tasks_res = client.get("/tasks", headers=headers1)
    assert tasks_res.status_code == 200
    assert any(t["task_id"] == task_id for t in tasks_res.json()["tasks"])

    # 3. User 2 cannot see User 1's tasks
    u2_tasks = client.get("/tasks", headers=headers2)
    assert not any(t["task_id"] == task_id for t in u2_tasks.json()["tasks"])

    # 4. User 2 cannot access or edit User 1's task directly (403 Forbidden)
    u2_single = client.get(f"/tasks/{task_id}", headers=headers2)
    assert u2_single.status_code == 403

    u2_update = client.put(f"/tasks/{task_id}", json={"title": "Hacked Title"}, headers=headers2)
    assert u2_update.status_code == 403

    # 5. User 1 updates task
    u1_update = client.put(f"/tasks/{task_id}", json={
        "title": "Build Advanced AI Model",
        "status": "Completed"
    }, headers=headers1)
    assert u1_update.status_code == 200
    assert u1_update.json()["task"]["status"] == "Completed"

    # 6. Check task statistics
    stats_res = client.get("/tasks/stats", headers=headers1)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["completed_tasks"] >= 1
    assert stats["total_tasks"] >= 1

    # 7. Clear completed tasks
    clear_res = client.delete("/tasks/completed", headers=headers1)
    assert clear_res.status_code == 200
    assert clear_res.json()["tasks_removed_count"] >= 1

    # 8. User 2's tasks are untouched
    assert client.get("/tasks", headers=headers2).status_code == 200


def test_competitor_analysis_endpoints():
    # 1. Market insights
    insights = client.get("/analysis/food-delivery")
    assert insights.status_code == 200
    data = insights.json()
    assert "competitors" in data

    # 2. Zomato & Swiggy detail
    zomato = client.get("/competitor-analysis/food-delivery/zomato")
    assert zomato.status_code == 200
    assert zomato.json()["app_name"] == "Zomato"
    assert "good_features" in zomato.json()

    swiggy = client.get("/competitor-analysis/food-delivery/swiggy")
    assert swiggy.status_code == 200
    assert swiggy.json()["app_name"] == "Swiggy"
    assert "bad_features" in swiggy.json()

    # 3. Chart endpoints (verify PNG response)
    chart1 = client.get("/competitor-analysis/food-delivery/charts")
    assert chart1.status_code == 200
    assert chart1.headers["content-type"] == "image/png"

    chart_z = client.get("/competitor-analysis/food-delivery/zomato/chart")
    assert chart_z.status_code == 200
    assert chart_z.headers["content-type"] == "image/png"

    chart_s = client.get("/competitor-analysis/food-delivery/swiggy/chart")
    assert chart_s.status_code == 200
    assert chart_s.headers["content-type"] == "image/png"


def test_password_recovery_and_reset_flow():
    # 1. Request password recovery
    recover_res = client.post("/users/recover-credentials", json={"email": TEST_EMAIL})
    assert recover_res.status_code == 200
    data = recover_res.json()
    assert "reset_token" in data or data.get("email_sent") is True

    reset_token = data.get("reset_token")
    if reset_token:
        # 2. Reset password using token
        new_pass = "BrandNewPassword789!"
        reset_res = client.post("/users/reset-password", json={
            "token": reset_token,
            "new_password": new_pass
        })
        assert reset_res.status_code == 200

        # 3. Old password should fail
        old_login = client.post("/login", json={"username": TEST_USER, "password": TEST_PASSWORD})
        assert old_login.status_code == 401

        # 4. New password should succeed
        new_login = client.post("/login", json={"username": TEST_USER, "password": new_pass})
        assert new_login.status_code == 200
        assert new_login.json()["authenticated"] is True


def test_change_password_and_update_username():
    temp_user = "user_account_changer"
    temp_email = "changer@buisease.com"
    initial_pass = "StartPass123!"
    
    # Register
    reg = client.post("/register", json={"username": temp_user, "email": temp_email, "password": initial_pass})
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a task linked to this user
    task_res = client.post("/tasks", json={"title": "Sync Test", "description": "Ensure task syncs on username change"}, headers=headers)
    assert task_res.status_code == 201
    
    # Change password
    new_pass = "NextPass456!"
    change_res = client.put("/users/change-password", json={
        "current_password": initial_pass,
        "new_password": new_pass
    }, headers=headers)
    assert change_res.status_code == 200
    
    # Verify login with new password
    login_new = client.post("/login", json={"username": temp_user, "password": new_pass})
    assert login_new.status_code == 200
    
    # Update username
    updated_name = "user_account_changed"
    update_name_res = client.put("/users/update-username", json={
        "new_username": updated_name,
        "password": new_pass
    }, headers=headers)
    assert update_name_res.status_code == 200
    assert update_name_res.json()["new_username"] == updated_name
    assert update_name_res.json()["linked_tasks_updated"] >= 1
    new_user_token = update_name_res.json()["access_token"]
    
    # Check that new token can access tasks under new username
    new_headers = {"Authorization": f"Bearer {new_user_token}"}
    tasks_check = client.get("/tasks", headers=new_headers)
    assert tasks_check.status_code == 200
    assert tasks_check.json()["username"] == updated_name
    assert len(tasks_check.json()["tasks"]) >= 1
    
    # Cleanup
    db = read_db()
    db["users"] = [u for u in db["users"] if u.get("username") not in [temp_user, updated_name]]
    db["study_tasks"] = [t for t in db["study_tasks"] if t.get("username") not in [temp_user, updated_name]]
    write_db(db)
