import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import api, read_db, write_db

client = TestClient(api)

def test_full_user_lifecycle_and_frontend_flows():
    # Phase A: User registration
    e2e_user = "e2e_founder_alpha"
    e2e_email = "alpha@startupbuisease.io"
    e2e_pass = "AlphaPass2026!"

    reg = client.post("/register", json={
        "username": e2e_user,
        "email": e2e_email,
        "password": e2e_pass
    })
    assert reg.status_code == 201, f"Registration failed: {reg.text}"
    token = reg.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Phase B: Profile retrieval
    profile = client.get("/users/me", headers=auth_headers)
    assert profile.status_code == 200
    assert profile.json()["username"] == e2e_user
    assert profile.json()["email"] == e2e_email

    # Phase C: Initial stats
    stats_0 = client.get("/tasks/stats", headers=auth_headers)
    assert stats_0.status_code == 200
    assert stats_0.json()["total_tasks"] == 0

    # Phase D: Create 3 Tasks
    t1 = client.post("/tasks", json={"title": "Analyze Zomato Pricing", "description": "Review surge fees"}, headers=auth_headers).json()["task"]
    t2 = client.post("/tasks", json={"title": "Audit Swiggy One Perks", "description": "Membership delivery limits"}, headers=auth_headers).json()["task"]
    t3 = client.post("/tasks", json={"title": "Draft Business Plan", "description": "BuisEase pitch deck"}, headers=auth_headers).json()["task"]

    # Phase E: List tasks
    all_tasks = client.get("/tasks", headers=auth_headers).json()["tasks"]
    assert len(all_tasks) == 3

    # Phase F: Complete task 1
    update_res = client.put(f"/tasks/{t1['task_id']}", json={"status": "Completed"}, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["task"]["status"] == "Completed"

    # Phase G: Verify recalculated stats
    stats_1 = client.get("/tasks/stats", headers=auth_headers).json()
    assert stats_1["total_tasks"] == 3
    assert stats_1["completed_tasks"] == 1
    assert stats_1["pending_tasks"] == 2
    assert stats_1["completion_percentage"] == 33.33

    # Phase H: Bar chart stream
    chart_res = client.get(f"/tasks/stats/bar-chart?username={e2e_user}&token={token}")
    assert chart_res.status_code == 200
    assert chart_res.headers["content-type"] == "image/png"
    assert len(chart_res.content) > 1000

    # Phase I: Market Intelligence Endpoints
    fd = client.get("/analysis/food-delivery")
    assert fd.status_code == 200
    assert "Zomato" in fd.json()["competitors"]
    assert "Swiggy" in fd.json()["competitors"]

    zomato = client.get("/competitor-analysis/food-delivery/zomato").json()
    assert len(zomato["good_features"]) > 0
    assert len(zomato["bad_features"]) > 0

    swiggy = client.get("/competitor-analysis/food-delivery/swiggy").json()
    assert len(swiggy["good_features"]) > 0
    assert len(swiggy["bad_features"]) > 0

    chart_all = client.get("/competitor-analysis/food-delivery/charts")
    assert chart_all.status_code == 200
    assert chart_all.headers["content-type"] == "image/png"

    # Phase J: Change password
    new_e2e_pass = "AlphaPass2027Updated!"
    ch_pass = client.put("/users/change-password", json={
        "current_password": e2e_pass,
        "new_password": new_e2e_pass
    }, headers=auth_headers)
    assert ch_pass.status_code == 200

    # Phase K: Update username
    new_username = "e2e_founder_beta"
    up_user = client.put("/users/update-username", json={
        "new_username": new_username,
        "password": new_e2e_pass
    }, headers=auth_headers)
    assert up_user.status_code == 200
    new_token = up_user.json()["access_token"]
    new_headers = {"Authorization": f"Bearer {new_token}"}

    # Verify tasks transferred to new username
    tasks_beta = client.get("/tasks", headers=new_headers).json()["tasks"]
    assert len(tasks_beta) == 3
    assert all(t["username"] == new_username for t in tasks_beta)

    # Phase L: Clear completed tasks
    clear_res = client.delete("/tasks/completed", headers=new_headers)
    assert clear_res.status_code == 200
    assert clear_res.json()["tasks_removed_count"] == 1

    remaining_tasks = client.get("/tasks", headers=new_headers).json()["tasks"]
    assert len(remaining_tasks) == 2

    # Phase M: Delete single task
    del_res = client.delete(f"/tasks/{t2['task_id']}", headers=new_headers)
    assert del_res.status_code == 200

    final_tasks = client.get("/tasks", headers=new_headers).json()["tasks"]
    assert len(final_tasks) == 1

    # Phase N: Logout
    logout_res = client.post("/logout", json={"username": new_username})
    assert logout_res.status_code == 200
    assert logout_res.json()["session_cleared"] is True

    # Teardown
    db = read_db()
    db["users"] = [u for u in db["users"] if u.get("username") not in [e2e_user, new_username]]
    db["study_tasks"] = [t for t in db["study_tasks"] if t.get("username") not in [e2e_user, new_username]]
    write_db(db)
