# ---------- Container registry: one ECR repository per image ----------
resource "aws_ecr_repository" "image" {
  for_each             = toset(["ctm-api", "ctm-web"])
  name                 = each.key
  image_tag_mutability = "MUTABLE" # "latest" is re-pointed on every release
  force_delete         = true      # lets terraform destroy remove repos that still hold images

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Keep storage (and cost) small: only the 10 newest images per repository.
resource "aws_ecr_lifecycle_policy" "image" {
  for_each   = aws_ecr_repository.image
  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the 10 newest images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

locals {
  # e.g. 865526619696.dkr.ecr.us-east-1.amazonaws.com
  registry = split("/", aws_ecr_repository.image["ctm-api"].repository_url)[0]
}
