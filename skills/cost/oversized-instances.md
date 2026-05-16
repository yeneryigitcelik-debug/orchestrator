# Oversized Instances

## Ararsın
- EC2 / Cloud Run / Fly instance sürekli %15 CPU (overprovisioned)
- RDS db.r5.4xlarge ama avg connection 10
- Reserved instance yok (1y commit %40 indirim)
- Burst-able instance yerine fix (t3 vs m5)
- Multi-AZ replica needed olmadığı halde aktif

## Patterns
- AWS Cost Explorer "Right Sizing Recommendations" ignored
- DB stat: avg CPU <%20 / month
- Workload predictable ama on-demand

## Severity
- **medium**: Aylık $500-2000 overspend
- **low**: Optimize

## Doğrusu
- Right-size: avg + p95 + headroom
- Reserved/Savings Plan 1y commit
- Spot instance non-critical workload
- Auto-scaling (worker tier)

## Örnek
`{"severity":"medium","rule":"oversized-db","file":"infra/terraform/db.tf","line":4,"why":"RDS db.r5.4xlarge ($1200/ay) avg CPU %12, connection 8 — db.t3.large ($120) yeterli","fix":"Önce db.t3.large'a downsize, 30 gün izle + RI commit","evidence":"resource aws_db_instance.main { instance_class = 'db.r5.4xlarge' }"}`
