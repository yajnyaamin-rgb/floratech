from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from db import get_db
from dotenv import load_dotenv
from datetime import date

import os
import json
import base64
import uuid

load_dotenv()
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)


# ── SERVE FRONTEND ────────────────────────────────────────────────
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/health')
def health():
    return jsonify({"status": "Backend is running!"})


# ── AUTH ──────────────────────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
def login():
    d = request.json
    db = get_db(); cur = db.cursor()
    cur.execute("SELECT * FROM users WHERE username=%s AND password=%s AND role=%s",
                (d['username'], d['password'], d['role']))
    user = cur.fetchone()
    db.close()
    if user and user['status'] == 'active':
        return jsonify({"success": True, "user": user})
    return jsonify({"success": False, "message": "Invalid credentials or inactive account"})
@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory('images', filename)

@app.route('/api/register', methods=['POST'])
def register():
    print("DATA RECEIVED:", request.json)

    d = request.json
    db = get_db()
    cur = db.cursor()

    cur.execute("SELECT id FROM users WHERE username=%s", (d['username'],))
    if cur.fetchone():
        db.close()
        return jsonify({"success": False, "message": "Username already taken"})

    cur.execute("""
        INSERT INTO users (name, username, password, role, email, address, phone)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        d.get('name'),
        d.get('username'),
        d.get('password'),
        d.get('role', 'citizen'),
        d.get('email'),
        d.get('address', ''),
        d.get('phone')
    ))

    db.commit()
    db.close()

    return jsonify({"success": True, "message": "Account created!"})

# ── SHOP ──────────────────────────────────────────────────────────
# -------- GET --------
@app.route('/api/shop', methods=['GET'])
def get_shop():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM shop_items")
    items = cur.fetchall()
    db.close()
    return jsonify(items)


# -------- POST --------
@app.route('/api/shop', methods=['POST'])
def add_product():
    data = request.get_json(force=True)

    print("DATA RECEIVED:", data)

    name = data.get('name')
    category = data.get('category')
    price = data.get('price')
    description = data.get('desc')
    image = data.get('image')

    if not name or not price:
        return jsonify({"success": False, "message": "Missing fields"}), 400

    db = get_db()
    cur = db.cursor()

    import uuid
    product_id = str(uuid.uuid4())[:8]

    cur.execute("""
        INSERT INTO shop_items (id, name, category, price, description, image)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (product_id, name, category, price, description, image))

    db.commit()
    db.close()

    return jsonify({"success": True})




# -------- DELETE --------
@app.route('/api/shop/<id>', methods=['DELETE'])
def delete_product(id):
    db = get_db()
    cur = db.cursor()

    cur.execute("DELETE FROM shop_items WHERE id=%s", (id,))
    db.commit()
    db.close()

    return jsonify({"success": True})
    data = request.get_json(force=True)

    print("DATA RECEIVED:", data)  

    if not data:
        return jsonify({"error": "No data received"}), 400

    name = data.get('name')
    category = data.get('category')
    price = data.get('price')
    description = data.get('desc')
    image_data = data.get('image')

    image_path = None

    if image_data:
        if "base64" in image_data:
            try:
                header, encoded = image_data.split(",", 1)
                file_ext = header.split("/")[1].split(";")[0]

                filename = f"{uuid.uuid4()}.{file_ext}"
                file_path = os.path.join("images", filename)

                with open(file_path, "wb") as f:
                    f.write(base64.b64decode(encoded))

                image_path = f"images/{filename}"

            except Exception as e:
                print("Image error:", e)
        else:
            image_path = image_data

    db = get_db()
    cur = db.cursor()

    cur.execute("""
        INSERT INTO shop_items (id, name, category, price, description, image)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        str(uuid.uuid4())[:8],
        name,
        category,
        price,
        description,
        image_path
    ))

    db.commit()
    db.close()

    return jsonify({"success": True})

# ── ORDERS ────────────────────────────────────────────────────────
@app.route('/api/orders', methods=['GET'])
def get_orders():
    db = get_db(); cur = db.cursor()
    cur.execute("""SELECT o.*, u.name AS buyer_name
                   FROM orders o LEFT JOIN users u ON o.user_id = u.id
                   ORDER BY o.date DESC""")
    orders = cur.fetchall(); db.close()
    for o in orders:
        if isinstance(o['items'], str):
            o['items'] = json.loads(o['items'])
        if o.get('date') and not isinstance(o['date'], str):
            o['date'] = str(o['date'])
    return jsonify(orders)

@app.route('/api/orders', methods=['POST'])
def place_order():
    d = request.json
    db = get_db(); cur = db.cursor()
    order_id = 'ORD' + str(int(__import__('time').time()))
    cur.execute("""INSERT INTO orders (id, user_id, items, total, addr, status, date, pay)
                   VALUES (%s,%s,%s,%s,%s,'pending',%s,%s)""",
                (order_id, d['userId'], json.dumps(d['items']),
                 d['total'], d['addr'], str(date.today()), d.get('pay','cod')))
    db.commit(); db.close()
    return jsonify({"success": True, "orderId": order_id})

@app.route('/api/orders/<order_id>/deliver', methods=['PUT'])
def mark_delivered(order_id):
    db = get_db(); cur = db.cursor()
    cur.execute("UPDATE orders SET status='delivered' WHERE id=%s", (order_id,))
    db.commit(); db.close()
    return jsonify({"success": True})


# ── PLANTATIONS ───────────────────────────────────────────────────
@app.route('/api/plantations/all', methods=['GET'])
def get_all_plantations():
    db = get_db(); cur = db.cursor()
    cur.execute("""SELECT p.*, u.name AS owner_name
                   FROM plantations p LEFT JOIN users u ON p.user_id = u.id
                   ORDER BY p.id DESC""")
    rows = cur.fetchall()
    db.close()
    for r in rows:
        if r.get('date') and not isinstance(r['date'], str):
            r['date'] = str(r['date'])
    return jsonify(rows)

@app.route('/api/plantations/<int:user_id>', methods=['GET'])
def get_plantations(user_id):
    db = get_db(); cur = db.cursor()
    cur.execute("SELECT * FROM plantations WHERE user_id=%s ORDER BY id DESC", (user_id,))
    rows = cur.fetchall(); db.close()
    for r in rows:
        if r.get('date') and not isinstance(r['date'], str):
            r['date'] = str(r['date'])
    return jsonify(rows)

@app.route('/api/plantations', methods=['POST'])
def add_plantation():
    d = request.json
    co2_map = {'planted': 5, 'growing': 12, 'mature': 28}
    co2 = co2_map.get(d['status'], 5)
    db = get_db(); cur = db.cursor()
    cur.execute("""INSERT INTO plantations (user_id, name, location, date, status, co2, note)
                   VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (d['userId'], d['name'], d['location'], d['date'], d['status'], co2, d.get('note','')))
    db.commit(); db.close()
    return jsonify({"success": True, "co2": co2})

@app.route('/api/plantations/<int:plant_id>', methods=['DELETE'])
def delete_plantation(plant_id):
    db = get_db(); cur = db.cursor()
    cur.execute("DELETE FROM plantations WHERE id=%s", (plant_id,))
    db.commit(); db.close()
    return jsonify({"success": True})


# ── FEEDBACK ──────────────────────────────────────────────────────
@app.route('/api/feedback', methods=['GET'])
def get_feedback():
    db = get_db();cur = db.cursor()
    cur.execute("SELECT * FROM feedback ORDER BY id DESC")
    rows = cur.fetchall(); db.close()
    return jsonify(rows)

@app.route('/api/feedback', methods=['POST'])
def add_feedback():
    d = request.json
    db = get_db(); cur = db.cursor()
    cur.execute("""INSERT INTO feedback (user_id, username, name, role, text, time, likes)
                   VALUES (%s,%s,%s,%s,%s,'Just now',0)""",
                (d['userId'], d['username'], d['name'], d['role'], d['text']))
    db.commit(); db.close()
    return jsonify({"success": True})

@app.route('/api/feedback/<int:fid>', methods=['DELETE'])
def delete_feedback(fid):
    db = get_db(); cur = db.cursor()
    cur.execute("DELETE FROM feedback WHERE id=%s", (fid,))
    db.commit(); db.close()
    return jsonify({"success": True})


# ── EVENTS ────────────────────────────────────────────────────────
@app.route('/api/events', methods=['GET'])
def get_events():
    db = get_db(); cur = db.cursor()
    cur.execute("SELECT * FROM events ORDER BY date ASC")
    events = cur.fetchall()
    for ev in events:
        cur.execute("SELECT * FROM event_registrations WHERE event_id=%s", (ev['id'],))
        ev['registrations'] = cur.fetchall()
        if ev.get('time') and not isinstance(ev['time'], str):
            total = int(ev['time'].total_seconds())
            h, m = divmod(total // 60, 60)
            ev['time'] = f"{h:02d}:{m:02d}"
        if ev.get('date') and not isinstance(ev['date'], str):
            ev['date'] = str(ev['date'])
    db.close()
    return jsonify(events)

@app.route('/api/events', methods=['POST'])
def add_event():
    d = request.json
    db = get_db(); cur = db.cursor()
    cur.execute("""INSERT INTO events (title, description, date, time, location, max_reg)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                (d['title'], d['desc'], d['date'], d['time'], d['location'], d['maxReg']))
    db.commit(); db.close()
    return jsonify({"success": True})

@app.route('/api/events/<int:eid>', methods=['DELETE'])
def delete_event(eid):
    db = get_db(); cur = db.cursor()
    cur.execute("DELETE FROM event_registrations WHERE event_id=%s", (eid,))
    cur.execute("DELETE FROM events WHERE id=%s", (eid,))
    db.commit(); db.close()
    return jsonify({"success": True})

@app.route('/api/events/<int:eid>/register', methods=['POST'])
def register_event(eid):
    d = request.json
    db = get_db(); cur = db.cursor()
    cur.execute("SELECT id FROM event_registrations WHERE event_id=%s AND user_id=%s",
                (eid, d['userId']))
    if cur.fetchone():
        db.close()
        return jsonify({"success": False, "message": "Already registered for this event"})
    cur.execute("SELECT max_reg FROM events WHERE id=%s", (eid,))
    ev = cur.fetchone()
    cur.execute("SELECT COUNT(*) AS cnt FROM event_registrations WHERE event_id=%s", (eid,))
    count = cur.fetchone()['cnt']
    if count >= ev['max_reg']:
        db.close()
        return jsonify({"success": False, "message": "Event is fully booked"})
    cur.execute("""INSERT INTO event_registrations (event_id, user_id, name, username, phone, reg_time, seen)
                   VALUES (%s,%s,%s,%s,%s,NOW(),0)""",
                (eid, d['userId'], d['name'], d['username'], d['phone']))
    db.commit(); db.close()
    return jsonify({"success": True})


# ── WEATHER ───────────────────────────────────────────────────────
@app.route('/api/weather', methods=['GET'])
def get_weather():
    db = get_db(); cur = db.cursor()
    cur.execute("SELECT * FROM weather WHERE id=1")
    row = cur.fetchone(); db.close()
    return jsonify(row)

@app.route('/api/weather', methods=['PUT'])
def update_weather():
    d = request.json
    db = get_db(); cur = db.cursor()
    cur.execute("""UPDATE weather SET temp=%s, cond=%s, humidity=%s, wind=%s, aqi=%s, uv=%s WHERE id=1""",
                (d['temp'], d['cond'], d['humidity'], d['wind'], d['aqi'], d['uv']))
    db.commit(); db.close()
    return jsonify({"success": True})


# ── ADMIN USERS ───────────────────────────────────────────────────
@app.route('/api/users', methods=['GET'])
def get_users():
    db = get_db(); cur = db.cursor()
    cur.execute("SELECT * FROM users ORDER BY id ASC")
    users = cur.fetchall(); db.close()
    return jsonify(users)

@app.route('/api/users/<int:uid>/toggle', methods=['PUT'])
def toggle_user(uid):
    db = get_db(); cur = db.cursor()
    cur.execute("SELECT status FROM users WHERE id=%s", (uid,))
    user = cur.fetchone()
    if not user:
        db.close()
        return jsonify({"success": False, "message": "User not found"})
    new_status = 'inactive' if user['status'] == 'active' else 'active'
    cur.execute("UPDATE users SET status=%s WHERE id=%s", (new_status, uid))
    db.commit(); db.close()
    return jsonify({"success": True, "status": new_status})



import os

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))