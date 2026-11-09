variable "region" {
  description = "AWS region. Learner Lab only allows us-east-1 or us-west-2."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Name prefix for every resource."
  type        = string
  default     = "ctm"
}

variable "image_repo" {
  description = "Container registry prefix, lower case, e.g. ghcr.io/your-github-user"
  type        = string

  validation {
    condition     = var.image_repo == lower(var.image_repo)
    error_message = "image_repo must be lower case (GHCR requires it)."
  }
}

variable "instance_profile_name" {
  description = "Existing instance profile. Learner Lab cannot create IAM roles, so we reuse LabInstanceProfile."
  type        = string
  default     = "LabInstanceProfile"
}

variable "app_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "nat_instance_type" {
  type    = string
  default = "t3.nano"
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
