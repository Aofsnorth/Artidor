# Push to GitHub — checklist

The repo is renamed to **Artidor** and fully buildable. It just needs to land
on `github.com/Aofsnorth/Artidor`.

## One-time prep (you do this)

```bash
# 1. Authenticate with GitHub (browser flow)
gh auth login
#    -> GitHub.com
#    -> HTTPS (recommended)
#    -> Authenticate via web browser
gh auth status        # should print "Logged in to github.com as Aofsnorth"

# 2. Create the empty remote repo (do this once)
gh repo create Aofsnorth/Artidor --public --description "Artidor: free, open-source video editor for web, desktop, and mobile." --source=. --remote=origin
```

## Push the initial commit (after auth is set)

```bash
cd "C:/Users/Arthe/Documents/MyProject/OpenCut"

# Stage everything
git add -A

# Verify what's about to be committed
git status --short

# Commit
git commit -m "feat(artidor): initial commit

- Brand swap OpenCut -> Artidor (package names, manifests, README, Cloudflare)
- Logo switch to /logos/artidor/logo.svg
- Collab/share button next to Export with copy-link invite
- Google Drive public-link import (with not-public error handling)
- Text track: alignment, weight, italic, decoration, tracking
- Audio waveform: RMS-based global max so beat detection lights up
- Effect preview: procedural fallback + GPU error guard
- Asset panel: remove Folders card; route Overlays to dedicated view
- Single Add Track button
- Bookmark prev/next navigation in transport controls
- Remove 'Editing workspace' / 'Use Import button above' filler copy"

# Push and set upstream
git branch -M master
git push -u origin master
```

## Verify the result

```bash
gh repo view Aofsnorth/Artidor --web    # opens the GitHub repo
gh run list --limit 5                  # (only if you later add Actions)
```

## If `git push` rejects the branch

```bash
# If the remote was created with a default branch other than master
git branch -M main
git push -u origin main
```

## Future commits

```bash
git add -A
git commit -m "<type>: <short description>"   # feat | fix | refactor | docs | test | ci | chore
git push
```
