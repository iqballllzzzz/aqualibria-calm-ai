# 🌊 AqualibriaAI

AqualibriaAI is a powerful, full-stack AI Agent ecosystem designed to transform multi-modal inputs into actionable digital assets and interactive learning experiences. Built with TypeScript and powered by Supabase, AqualibriaAI orchestrates complex workflows to generate text, images, videos, presentations, and interactive educational content from a single source of truth.

---

## 🚀 Key Features

AqualibriaAI is an all-in-one AI ecosystem equipped with advanced multi-modal capabilities. Simply provide a YouTube URL, an image, a video, or text, and the agent will handle the rest:

* **Full-Stack AI Agent:** Autonomously orchestrates multi-step workflows, manages state, and interacts with external databases.
* **Core LLM Operations:** Seamless text generation, summarization, and advanced reasoning capabilities.
* **Media Studio:** Automated high-quality video and image generation based on contextual inputs.
* **AI Slides (Presentation Builder):** Automatically structures and generates fully-formatted presentation decks.
* **AI Design (Web UI/UX Builder):** Converts prompt data or wireframe inputs into clean, modern website design concepts.
* **Smart Learning Suite:** Instantly extracts knowledge from multi-modal sources to generate:
  * Interactive Quizzes
  * Smart Flashcards
  * Concise & Clear Summaries
  * Dynamic Mindmaps

---

## 🛠️ Tech Stack & Architecture

The architecture is built for extreme speed, scalability, and heavy data processing:

* **Frontend & Core Framework:** React, Vite, and Tailwind CSS.
* **Programming Language:** TypeScript (89.3%) - Ensuring robust type-safety across complex AI tool-calling mechanisms.
* **Database & Vector Storage:** Supabase & PostgreSQL (PLpgSQL) - Leveraging `pgvector` for efficient AI agent long-term memory, semantic search, and prompt embeddings caching.

---

## 🔧 Getting Started

Follow these steps to run AqualibriaAI locally:

### 1. Clone the repository
```bash
git clone https://github.com
cd aqualibria-calm-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the development server
```bash
npm run dev
```

---

## 🗺️ Future Roadmap & OpenAI Integration Plan

AqualibriaAI is designed with a strictly modular, model-agnostic architecture. While the current build is powered by Gemini API, we are actively transitioning our core workflows to the OpenAI ecosystem to leverage advanced reasoning models.

- [x] Multi-modal parsing (YouTube URL, Image, Video, Text extraction)
- [x] Full-Stack AI Agent orchestration & state management via Supabase
- [x] Smart Learning Suite & Presentation generators (TypeScript-based)
- [ ] **Official OpenAI API Integration** *(In Progress / Awaiting OSS Grant)*
  * Migrate complex UI/UX agent workflows to OpenAI Models
  * Implement advanced function calling/tools utilizing OpenAI ecosystem
- [ ] Native Long-term Memory Optimization using OpenAI Embeddings + Supabase Vector

---

## 🧑‍💻 Current Status

* **Status:** Active Development
* **License:** [MIT License](LICENSE)
* **Target:** Fully open-source and free for the developer community. Non-commercial ecosystem.

---

### 📢 Project Status Notice
> **Note to Reviewers & Contributors:**  
> The core multi-modal full-stack dashboard is currently undergoing heavy front-end memory optimization and database migration to better handle large multi-media data streams (which may cause temporary client-side rendering blanks on the main domain).
>
> 🌐 **Explore Our Project Context:**  
> To review the project's vision, architecture, and documentation, please visit our official landing page:  
> 👉 **[AqualibriaAI Official About Page](https://aqualibrya.my.id/about)**

---
