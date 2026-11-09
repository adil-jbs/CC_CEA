# ---------- Load balancer ----------
resource "aws_lb" "main" {
  name               = "${var.project}-alb"
  load_balancer_type = "application"
  internal           = false
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.alb.id]
}

resource "aws_lb_target_group" "web" {
  name                 = "${var.project}-web-tg"
  port                 = 80
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  deregistration_delay = 30

  health_check {
    path                = "/healthz"
    matcher             = "200"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

# ---------- Launch template + Auto Scaling Group ----------
resource "aws_launch_template" "app" {
  name_prefix   = "${var.project}-app-"
  image_id      = data.aws_ssm_parameter.al2023.value
  instance_type = var.app_instance_type

  # No key pair and no public IP: admin access is through SSM Session Manager only.
  vpc_security_group_ids = [aws_security_group.app.id]

  iam_instance_profile {
    arn = aws_iam_instance_profile.app.arn
  }

  metadata_options {
    http_tokens                 = "required" # IMDSv2 only
    http_put_response_hop_limit = 2
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_type           = "gp3"
      volume_size           = 8
      encrypted             = true
      delete_on_termination = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/app_user_data.sh.tftpl", {
    compose_file  = file("${path.module}/../docker-compose.prod.yml")
    deploy_script = file("${path.module}/../deploy/ec2-deploy.sh")
  }))

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "${var.project}-app", app = var.project }
  }

  # Instances read these at boot, so they must exist first.
  depends_on = [
    aws_ssm_parameter.db_host,
    aws_ssm_parameter.db_user,
    aws_ssm_parameter.db_name,
    aws_ssm_parameter.db_password,
    aws_ssm_parameter.image_repo,
    aws_ssm_parameter.image_tag,
    aws_cloudwatch_log_group.app,
    aws_route_table_association.app,
    aws_iam_role_policy.app,
    aws_iam_role_policy_attachment.ssm_core,
    aws_iam_role_policy_attachment.ecr_read,
  ]
}

resource "aws_autoscaling_group" "app" {
  name                      = "${var.project}-asg"
  min_size                  = var.asg_min
  desired_capacity          = var.asg_desired
  max_size                  = var.asg_max
  vpc_zone_identifier       = aws_subnet.app[*].id
  target_group_arns         = [aws_lb_target_group.web.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version
  }

  # Replace instances one at a time when the launch template changes.
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "app"
    value               = var.project
    propagate_at_launch = true
  }
}

# Elasticity: keep average CPU around 50 %.
resource "aws_autoscaling_policy" "cpu" {
  name                   = "${var.project}-cpu-target"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 50
  }
}
