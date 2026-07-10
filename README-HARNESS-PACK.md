# Artidor Harness Engineering Pack

Copy semua isi folder ini ke root repository Artidor.

Langkah aman:

```bash
git checkout -b chore/harness-engineering
git add .
git commit -m "chore: add harness engineering guardrails"
```

Setelah itu aktifkan branch protection di GitHub:

- Require pull request before merging
- Require status checks to pass
- Require review from CODEOWNERS
- Block force pushes
- Block direct push to main
