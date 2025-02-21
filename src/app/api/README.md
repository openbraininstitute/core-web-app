Please note that `/api` route is shared across the Core Web app and other services,
e.g. accounting (`/api/accounting`), virtual lab manager (`/api/virtual-lab-manager`), etc.
which is defined in [aws-terraform-deployment](https://github.com/openbraininstitute/aws-terraform-deployment) repo.

When adding a new route please make sure there are no conflicts with existing services.
