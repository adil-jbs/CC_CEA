variable "region" {
  description = "AWS region."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Name prefix for every resource."
  type        = string
  default     = "ctm"
}

variable "budget_email" {
  description = "Where AWS Budgets sends cost alerts."
  type        = string
}

variable "budget_usd" {
  description = "Monthly budget in USD; alerts at 50 % actual and 100 % forecast."
  type        = string
  default     = "10"
}

variable "app_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "nat_instance_type" {
  description = "Must be Free Tier eligible on AWS Free plan accounts (t3.nano is rejected)."
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "asg_min" {
  type    = number
  default = 2
}

variable "asg_desired" {
  type    = number
  default = 2
}

variable "asg_max" {
  type    = number
  default = 3
}
