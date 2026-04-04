# Branch Workflow

## Recommended Strategy

This project should use a small, standard Git flow:

- `main`: production branch
- `develop`: staging integration branch
- `feature/*`: isolated feature or experiment branches
- `hotfix/*`: urgent production fixes

This keeps production stable, gives staging a single integration branch, and
makes unfinished experiments easy to leave out of production.

## What Each Branch Is For

- `main`
  Holds only production-ready code. Every push to `main` deploys production.
- `develop`
  Holds the next candidate for release. Every push to `develop` deploys staging.
- `feature/*`
  Use for normal work, experiments, and isolated changes. Open PRs from these
  branches into `develop`.
- `hotfix/*`
  Use only for urgent production fixes. Open PRs from these branches into
  `main`, then merge `main` back into `develop`.

## Default Daily Flow

1. Branch from `develop`
2. Work in `feature/your-change`
3. Open a PR into `develop`
4. Merge into `develop`
5. Review the result on `https://staging.vnutri.live`
6. When the staged changes are approved, open a PR from `develop` into `main`
7. Merge into `main` to deploy production

This `develop -> main` promotion path should be the default release path for
this project. It is the safest and simplest option for a solo founder or small
team because it keeps staging review and production promotion aligned.

## Starting A New Feature

Create a feature branch from `develop`:

```bash
git checkout develop
git pull
git checkout -b feature/clear-name
```

When the feature is ready for staging review, open a PR into `develop`.

## Testing On Staging

- Merge the feature PR into `develop`
- Wait for the staging deploy workflow to finish
- Review the change on `https://staging.vnutri.live`

Feature branches do not deploy directly to production.

## Promoting Changes To Production

Recommended default:

- open a PR from `develop` into `main`
- merge it after staging review is complete

This is the normal path for releases because it promotes exactly what was
reviewed on staging.

## Excluding A Failed Experiment From Production

The easiest way to exclude an experiment is not to merge its `feature/*` branch
into `develop` in the first place.

If the experiment was merged into `develop` but should not ship:

- revert it on `develop`, or
- keep it out of the `develop -> main` promotion PR by preparing a smaller PR
  for production

Use the fallback promotion model below only when you need to ship one approved
change without shipping the rest of `develop`.

## Fallback For Promoting Only One Feature

Default release path should remain `develop -> main`.

Fallback option for a selective release:

1. branch from `main`
2. cherry-pick only the approved commit(s) from `develop` or the original
   `feature/*` branch
3. open a PR from that branch into `main`
4. merge it after review

This is intentionally the exception path, not the default path.

## Rollback Strategy

Normal rollback:

- create a revert PR against `main`
- merge it into `main`
- let the production deploy workflow redeploy the reverted state

After the rollback lands on `main`, merge `main` back into `develop` so the
branches stay aligned.

Emergency rollback:

- if production must be restored immediately, redeploy the previous working
  production revision in Yandex Cloud
- after that, still fix Git history by reverting the bad change on `main`

## Hotfix Flow

1. branch from `main` into `hotfix/clear-name`
2. fix the issue
3. open a PR into `main`
4. merge it to deploy production
5. merge `main` back into `develop`

This keeps urgent fixes fast without losing them in staging.

## Recommended GitHub Settings

Keep this lightweight:

- protect `main` from direct pushes
- use PRs into `main`
- optionally protect `develop` too if you want cleaner staging history

The branch strategy works without extra process layers, release trains, or
versioning overhead.
