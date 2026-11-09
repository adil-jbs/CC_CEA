# Task Manager: a simple 3-tier application

| Tier | What | Tech | Folder | Port |
|------|------|------|--------|------|
| 1. Web (presentation) | Static page + reverse proxy | Nginx | `web/` | 80 |
| 2. App (logic) | REST API | Node.js + Express | `app/` | 3000 |
| 3. Data | Database | MySQL 8 (Amazon RDS on AWS) | `db/` | 3306 |

```
Browser ──► Web tier (Nginx :80) ──/api/*──► App tier (Node :3000) ──► DB tier (MySQL :3306)
```

The browser only talks to the web tier. Only the app tier talks to the database.

## API

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | – | Health check (for load balancers) |
| GET | `/api/tasks` | – | List tasks |
| POST | `/api/tasks` | `{ "title", "priority": "Low/Medium/High", "due_date": "YYYY-MM-DD" (optional) }` | Create a task |
| PATCH | `/api/tasks/:id` | `{ "done": true/false }` | Mark done / not done |
| DELETE | `/api/tasks/:id` | – | Delete a task |

## Run locally (Docker)

```bash
cp .env.example .env          # then edit DB_PASSWORD
docker compose up --build
```

Open http://localhost:8080

Run unit tests: `cd app && npm install && npm test`

## Deploy on AWS (classic 3-tier layout)

### 1. Network (VPC)
Create a VPC (e.g. `10.0.0.0/16`) across **2 Availability Zones** with:
- 2 **public** subnets for the web tier / internet-facing load balancer
- 2 **private** subnets for the app tier
- 2 **private** subnets for the database
- An Internet Gateway for the public subnets, and a NAT Gateway so private servers can install packages

The VPC console's **"VPC and more"** wizard creates all of this in one go.

### 2. Security groups (one per tier, each tier only trusts the one in front of it)

| Security group | Inbound rule | Source |
|----------------|-------------|--------|
| `web-sg` | HTTP 80 | `0.0.0.0/0` (or the ALB's SG) |
| `app-sg` | TCP 3000 | `web-sg` |
| `db-sg`  | MySQL 3306 | `app-sg` |

### 3. Database tier: Amazon RDS
- Engine: **MySQL 8**, template **Free tier**, instance `db.t3.micro` (or `db.t4g.micro`)
- Master username `admin` + a strong password
- VPC: yours. Subnet group: the 2 DB private subnets. **Public access: No**. SG: `db-sg`
- Additional configuration → **Initial database name: `tasks_db`**
- Copy the **endpoint** when it's ready

### 4. App tier: EC2 in a private subnet
- Amazon Linux 2023, `t3.micro`, private subnet, SG `app-sg`
- Edit the values at the top of [`deploy/app-server.sh`](deploy/app-server.sh) (repo URL, RDS endpoint, password) and paste it into **Advanced details → User data**
- Note the instance's **private IP**

### 5. Web tier: EC2 in a public subnet
- Amazon Linux 2023, `t3.micro`, public subnet, auto-assign public IP, SG `web-sg`
- Edit [`deploy/web-server.sh`](deploy/web-server.sh): set `API_UPSTREAM` to `<app-private-ip>:3000`, then paste it into **User data**
- Open `http://<web-public-ip>/`

### 6. (Optional) Production upgrades
- Put an **internet-facing ALB** in front of the web servers (health check path `/healthz`)
- Put an **internal ALB** in front of the app servers (health check `/api/health`) and point `API_UPSTREAM` at its DNS name
- Use **Auto Scaling Groups** per tier, **Multi-AZ** RDS, and keep the DB password in **Secrets Manager / SSM Parameter Store** rather than in user data

### Troubleshooting
- Page loads but says *"Could not reach the API"*: check `API_UPSTREAM` and that `app-sg` allows 3000 from `web-sg`
- On the app server: `sudo docker logs task-api` (a DB connection error means you should check the RDS endpoint/password and `db-sg`)
- On the web server: `sudo docker logs task-web`
- User data log on either server: `/var/log/cloud-init-output.log`

### Clean up (to avoid charges)
Delete the EC2 instances, RDS database, NAT Gateway, and Elastic IPs when you're done. The NAT Gateway and RDS are the ones that cost money.
