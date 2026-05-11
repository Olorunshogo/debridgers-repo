- Do I know anybody that'll handle aggressive marketing?
- Do I know anybody that'll handle aggressive sales?

- Praise, Email Marketing
- Selling bag of Beans

You can use cwebp (from the webp package) or sharp-cli. The cleanest single command uses sharp-cli which handles both jpg and png in one shot:

First check if either tool is available:

which cwebp || which sharp
If cwebp is available, this converts everything in one go:

# Convert all jpg/png in images/ and logos/ to WebP (keeps originals)

for f in apps/debridgers-frontend/public/images/_.{jpg,png} apps/debridgers-frontend/public/logos/_.png; do
cwebp -q 80 "$f" -o "${f%.\*}.webp"
done
If you'd rather use sharp-cli (Node-based, no system install needed):

npx sharp-cli --input "apps/debridgers-frontend/public/images/_.{jpg,png}" --output "apps/debridgers-frontend/public/images/" --format webp --quality 80
npx sharp-cli --input "apps/debridgers-frontend/public/logos/_.png" --output "apps/debridgers-frontend/public/logos/" --format webp --quality 80
Or the simplest option if you have imagemagick:

find apps/debridgers-frontend/public/images apps/debridgers-frontend/public/logos -name "_.jpg" -o -name "_.png" | xargs -I{} sh -c 'convert "{}" -quality 80 "${1%.\*}.webp"' \_ {}
Run which cwebp and let me know what's available — I'll give you the exact command to run. Once the .webp files exist, I'll update all the src references in the code to point to them.
