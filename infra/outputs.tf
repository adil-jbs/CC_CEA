output "app_url" {
  description = "Open this in a browser."
  value       = "http://${aws_lb.main.dns_name}"
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "asg_name" {
  value = aws_autoscaling_group.app.name
}

output "ecr_registry" {
  value = local.registry
}

output "rds_endpoint" {
  value = aws_db_instance.main.address
}
