## Owner claim request

**Business slug:** <!-- e.g. acme-coffee -->

**GitHub username:** @<!-- your username -->

### Checklist

- [ ] I represent this business and can verify ownership if asked
- [ ] I added my username under the correct slug in `config/business-owners.yaml`
- [ ] The slug matches an existing Businesses discussion

### Config change

```yaml
# config/business-owners.yaml
BUSINESS_SLUG:
  owners: [YOUR_GITHUB_USERNAME]
  verified_at: YYYY-MM-DD
```

Maintainers: verify the request, then merge to grant owner reply permissions.
