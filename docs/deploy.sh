#!/usr/bin/env bash

set -o xtrace

git remote set-url origin "https://x-access-token:$GITHUB_TOKEN@github.com/$GITHUB_REPOSITORY.git"
git config --global user.email "action@github.com"
git config --global user.name "GitHub Action"

GIT_USER=x-access-token GIT_PASS=$GITHUB_TOKEN DEPLOYMENT_BRANCH=docs yarn deploy
