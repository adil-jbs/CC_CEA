# ---------- Keyless CI/CD: GitHub Actions -> AWS through OIDC ----------
# No AWS keys are stored in GitHub. The workflow gets short-lived credentials
# for this role, and only from the main branch of the configured repository.

variable "github_owner" {
  type    = string
  default = "adil-jbs"
}

variable "github_repo_name" {
  type    = string
  default = "CC_CEA"
}

# GitHub now puts immutable IDs in the OIDC "sub" claim
# (repo:<owner>@<owner_id>/<repo>@<repo_id>:ref:...). Found via CloudTrail
# (AssumeRoleWithWebIdentity AccessDenied, userIdentity.userName).
# IDs come from https://api.github.com/repos/<owner>/<repo> (owner.id, id).
variable "github_owner_id" {
  type    = string
  default = "318685806"
}

variable "github_repo_id" {
  type    = string
  default = "1451615130"
}

locals {
  github_sub_main = "repo:${var.github_owner}@${var.github_owner_id}/${var.github_repo_name}@${var.github_repo_id}:ref:refs/heads/main"
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # No thumbprint needed: AWS validates GitHub's certificate through trusted CAs.
}

data "aws_iam_policy_document" "github_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.github_sub_main]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name                 = "${var.project}-github-deploy"
  assume_role_policy   = data.aws_iam_policy_document.github_trust.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPushOwnRepos"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
    ]
    resources = [for r in aws_ecr_repository.image : r.arn]
  }

  statement {
    sid       = "SetReleaseTag"
    actions   = ["ssm:PutParameter", "ssm:GetParameter"]
    resources = [aws_ssm_parameter.image_tag.arn]
  }

  # Run Command: only the stock shell document, only on instances tagged app=ctm.
  statement {
    sid       = "RunDeployDocument"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ssm:${var.region}::document/AWS-RunShellScript"]
  }

  statement {
    sid       = "RunOnAppInstancesOnly"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ec2:${var.region}:${data.aws_caller_identity.current.account_id}:instance/*"]
    condition {
      test     = "StringEquals"
      variable = "ssm:resourceTag/app"
      values   = [var.project]
    }
  }

  statement {
    sid = "ReadDeployStatus"
    actions = [
      "ssm:ListCommands",
      "ssm:ListCommandInvocations",
      "ssm:GetCommandInvocation",
      "elasticloadbalancing:DescribeLoadBalancers",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "${var.project}-github-deploy-policy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}
