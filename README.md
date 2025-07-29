# 💡 CareSight AI – Real-Time Fall Detection & Health Incident Reporting System

CareSight AI is an intelligent monitoring platform that detects elderly falls in real-time using deep learning and computer vision. It bridges AI, full-stack development, and healthcare to provide caregivers and institutions with timely insights and incident reports — reducing response times and potentially saving lives.

---

## 🧠 Problem Statement

> **Falls are the leading cause of injury among older adults.**  
> In long-term care facilities or home environments, delayed responses to falls can result in severe health complications, emotional trauma, or even death.

Despite the growing elderly population, affordable, real-time fall detection systems are lacking. Manual monitoring is inefficient and expensive. CareSight AI tackles this issue using an automated, scalable, AI-powered solution.

---

## ✅ Solution Overview

CareSight AI monitors sequences of video frames to determine whether a fall has occurred. It supports:

- ✅ Real-time fall detection from frame sequences
- ✅ High-confidence AI predictions using pre-labeled datasets
- ✅ A modern, responsive dashboard to trigger analysis
- ✅ Extensible backend for logging, notifications, and reporting (coming soon)

---

## 🔍 Demo Preview

![CareSight Dashboard](https://github.com/shara111/Caresight-AI/assets/your-demo-gif-or-screenshot.gif)

---

## ⚙️ Tech Stack

| Layer          | Technology                            |
|----------------|----------------------------------------|
| AI Model       | Python, OpenCV, NumPy                  |
| Backend        | Flask (Python), Flask-CORS             |
| Frontend       | React.js, Tailwind CSS                 |
| Integration    | Axios, RESTful APIs                    |
| Dataset        | UR Fall Detection Dataset (PNG images) |

---

## 📁 Project Structure

```bash
caresight-ai/
├── ai-models/            # Flask server + fall detection logic
│   └── sample_sequences/ # Contains the labeled fall/not-fall datasets
├── client/               # React dashboard frontend
├── server/               # Optional Node.js backend layer (if needed)
└── README.md
