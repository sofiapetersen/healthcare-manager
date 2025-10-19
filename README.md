# Patient Track App

A lightweight patient tracking application for managing patient records, appointments, and status updates. This repository contains the source for the Patient Track App (frontend + backend) and scripts to run, test, and build the project.

## Features
- Create, read, update, delete (CRUD) patient records
- Track appointments and visit history
- Simple role-based access (admin / staff)
- API-first design for easy integrations
- Docker support for local development and deployment
- n8n integration
- AI powered

## Tech stack
- Backend: Typescript, Node.js and n8n workflows
- Frontend: React / Vue / any SPA framework
- Database: PostgreSQL - Supabase
- Assistant: OpenAI LLM

## Prerequisites
- Node.js (>= 14) and npm or yarn
- Docker & Docker Compose (optional, recommended for full-stack local dev)
- Database server (Postgres/MySQL) or use the provided Docker Compose
- n8n server and jsons

## Quick local start 
1. Clone the repo
    ```
    git clone <repo-url>
    cd healthcare-manager
    ```
2. Import n8n file json into n8n server and change the webhook URL for your own (remember to set your credentials)

3. Install dependencies
    ```
    npm i
    
    ```
4. Start services
    ```
    npm run dev

    ```
5. Open the frontend at http://localhost:8080 (or configured port)


## Contact
Developed by Sofia Petersen AI powered

