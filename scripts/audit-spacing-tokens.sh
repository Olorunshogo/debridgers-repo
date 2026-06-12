#!/usr/bin/env sh
set -eu

if ! rg -n -P \
  -g '*.ts' \
  -g '*.tsx' \
  -g '*.js' \
  -g '*.jsx' \
  '(?<![A-Za-z0-9-])(?:gap|space-x|space-y|space-x-reverse|space-y-reverse|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|top|right|bottom|left|inset|inset-x|inset-y)-(?:xs|sm|md|base|lg|xl|2xl|3xl|4xl|5xl)(?![A-Za-z0-9-])|(?<![A-Za-z0-9-])(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|top|right|bottom|left|inset|inset-x|inset-y)-\(--space-(?:xs|sm|md|base|lg|xl|2xl|3xl|4xl|5xl)\)(?![A-Za-z0-9-])' \
  apps packages; then
  echo 'No semantic spacing token matches found.'
fi
