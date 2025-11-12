#!/bin/bash
# push.sh - Quick push script

# Commit message passed as argument, default "update"
msg=${1:-"update"}

git add .
git commit -m "$msg"
git push origin main
