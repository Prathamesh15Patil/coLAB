# Code-CoLAB(https://code-colab.prathameshvibe.xyz)

> A real-time collaborative environment designed to transform passive computer lab sessions into active, peer-driven learning experiences.

## Problem Statement

Traditional computer science labs suffer from a systemic pedagogical flaw: **passive learning**. Students often just copy-paste the program instead of learning the working(to complete their hand written lab journal the biggest 🚩), leading to:

- Lack of meaningful peer collaboration
- Poor engagement during practical exercises
- Blind copy-pasting of code without comprehension
- Difficulty conducting effective remote or hybrid programming sessions

Without real-time discussion and shared execution, practical labs fail to simulate the collaborative nature of modern software engineering.

## Solution Overview

<div align="center">
  <a href="https://youtu.be/lQFppTKu4xY">
    <img 
      src="https://img.youtube.com/vi/lQFppTKu4xY/hqdefault.jpg" 
      alt="Watch the Demo"
      width="800"
    />
  </a>
</div>
Code-CoLAB solves the pedagogical issue of passive learning by enforcing a **synchronized, collaborative workspace**. It is not just a text editor; it is a real-time systems project engineered to facilitate active pair-programming.

By integrating bidirectional state synchronization, isolated Docker-based execution, and peer-to-peer WebRTC voice communication, Code-CoLAB bridges the gap between isolated coding and true collaborative engineering.

## Core Features

- **Real-Time Collaborative Editor:** Low-latency real-time code synchronization across multiple clients using Socket.IO.
- **Docker-Based Execution Engine:** Unified, reproducible runtime environments eliminating the "works on my machine" problem.
- **Multi-Language Execution:** Native support for Python, Java, C etc inside secure containers.
- **WebRTC Voice Communication:** High-fidelity, low-latency peer-to-peer audio for immediate architectural discussions.
- **Assignment Workflow:** Structured environments for educators to distribute, monitor, and review team-based coding tasks.
- **Anti Copy-Paste Protections:**To ensure active typing and genuine code construction during assignments(ok they can see and write, that's fine atleast student will know what they are doing instead of quick c-p)
- **Sandbox Protection:** Containerized execution environments with resource and timeout constraints to reduce the impact of malicious or runaway code.

## System Architecture

The architecture is designed for high concurrency and strict isolation.

### Real-Time Collaboration Flow

Code-CoLAB utilizes **Socket.IO** for low-latency bidirectional communication over WebSockets.

```mermaid
graph LR
    A[Client A] <-->|Socket.IO Events| B(Node.js / Express Server)
    C[Client B] <-->|Socket.IO Events| B
    B <-->|State Sync| D[(MongoDB)]
```

_Why Socket.IO?_ It provides robust fallback polling and automatic reconnection, critical for maintaining synchronized editor states (via CodeMirror) across volatile network conditions.

### Docker Execution Pipeline

To safely execute untrusted student code, Code-CoLAB spins up ephemeral Docker containers.

```mermaid
graph LR
    A[Client Request] --> B[API Gateway]
    B --> C[Execution Queue]
    C --> D[Docker Engine]
    D -->|Spawns| E[Isolated Container]
    E -->|Returns Output| B
```

_Why Docker Sandboxing?_ Running arbitrary student code on a host server is a massive security risk. Docker ensures strict resource limits (memory, CPU, execution time) preventing infinite loops and malicious scripts from compromising the platform.

### WebRTC Voice Collaboration

```mermaid
graph LR
    A[Client A] -->|SDP Offer| B(Socket.IO Signaling)
    B -->|SDP Offer| C[Client B]
    C -->|SDP Answer| B
    B -->|SDP Answer| A
    A <==>|P2P Audio Stream| C
```

_Why WebRTC?_ P2P audio reduces server bandwidth overhead to zero once the connection is established. It keeps students engaged in verbal problem-solving without requiring third-party VoIP software.

## Tech Stack

| Layer                | Technologies                                 |
| :------------------- | :------------------------------------------- |
| **Frontend**         | React, CodeMirror(v5), Socket.IO Client      |
| **Backend**          | Node.js, Express.js, MongoDB, Mongoose       |
| **Realtime**         | Socket.IO (Signaling & Sync), WebRTC (Voice) |
| **Execution Engine** | Docker, Python Runtime, Java Runtime         |

## Security & Sandbox Measures

- **Execution Isolation:** Every code execution spawns a fresh, ephemeral Docker container without network access.
- **Infinite Loop Handling:** Strict CPU time limits and `timeout` commands kill runaway processes before they consume host resources.
- **Resource Quotas:** Memory limits are enforced at the Docker daemon level to prevent out-of-memory (OOM) crashes.

## Local Setup

### Prerequisites

- Node.js (v18+)
- MongoDB (Local or Atlas)
- **Docker Desktop / Docker Engine MUST be running** for the code execution engine to function.

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```

### Installation & Running

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/Code-CoLAB.git
   cd Code-CoLAB
   ```

2. **Backend Setup:**

   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

> Note: Creating and managing classes or assignments requires a faculty account.
> Use the following faculty credentials to log in and try assignment creation for your own class:
>
> - Email: `faculty1@email.com`
> - Password: `12345`

## Current Limitations

As an MVP focused on educational collaboration, the current architecture has several known limitations:

- Collaborative editing currently relies on Socket.IO event synchronization rather than CRDT/OT-based conflict resolution.
- Code execution is handled through Docker containers on a single host and is not horizontally scaled.
- Task execution currently does not use a distributed job queue.
- The platform is optimized for classroom-sized sessions rather than large-scale public deployment.

Future iterations may incorporate Redis, BullMQ, CRDT-based synchronization, and distributed execution workers.

- Advanced static code analysis and automated grading for assignments.
- Expanded language support (C++, Go, Rust) via optimized Docker images.

## Conclusion

Code-CoLAB is more than just a collaborative code editor. By addressing the core educational challenges of passive learning and student isolation, it provides a robust, real-time environment where active peer-studying and synchronized problem solving become the default mode of learning.
