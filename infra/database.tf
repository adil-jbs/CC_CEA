# ---------- Database tier: RDS MySQL in the private DB subnets ----------
resource "random_password" "db" {
  length  = 24
  special = false # keeps the value safe inside the compose .env file
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnets"
  subnet_ids = aws_subnet.db[*].id
  tags       = { Name = "${var.project}-db-subnets" }
}

resource "aws_db_instance" "main" {
  identifier             = "${var.project}-db"
  engine                 = "mysql"
  engine_version         = "8.4"
  instance_class         = var.db_instance_class
  allocated_storage      = 20
  storage_type           = "gp3"
  storage_encrypted      = true
  db_name                = "tasks_db"
  username               = "admin"
  password               = random_password.db.result
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false

  # Lab settings: fast create and delete, no leftover snapshots.
  backup_retention_period = 0
  skip_final_snapshot     = true
  deletion_protection     = false
  apply_immediately       = true

  tags = { Name = "${var.project}-db" }
}

# ---------- Configuration and secrets in SSM Parameter Store ----------
resource "aws_ssm_parameter" "db_host" {
  name  = "/${var.project}/db_host"
  type  = "String"
  value = aws_db_instance.main.address
}

resource "aws_ssm_parameter" "db_user" {
  name  = "/${var.project}/db_user"
  type  = "String"
  value = aws_db_instance.main.username
}

resource "aws_ssm_parameter" "db_name" {
  name  = "/${var.project}/db_name"
  type  = "String"
  value = aws_db_instance.main.db_name
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.project}/db_password"
  type  = "SecureString"
  value = random_password.db.result
}

resource "aws_ssm_parameter" "image_repo" {
  name  = "/${var.project}/image_repo"
  type  = "String"
  value = var.image_registry
}

# The pipeline overwrites this with the commit SHA on every release.
resource "aws_ssm_parameter" "image_tag" {
  name  = "/${var.project}/image_tag"
  type  = "String"
  value = "latest"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/${var.project}/app"
  retention_in_days = 7
}
