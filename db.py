<<<<<<< HEAD
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def get_db():
    return pymysql.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", 3307)),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        cursorclass=pymysql.cursors.DictCursor,
        charset='utf8mb4'
=======
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def get_db():
    return pymysql.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", 3307)),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        cursorclass=pymysql.cursors.DictCursor,
        charset='utf8mb4'
>>>>>>> c32490cda96b67f80fda9bec79f473300dcf7193
    )