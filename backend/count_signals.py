import re
from collections import Counter

with open('app/engine/mega_seo_engine.py', 'r', encoding='utf-8') as f:
    content = f.read()

ids = re.findall(r'self\._s\("([A-Z]+\d+)"', content)
unique = sorted(set(ids))
print(f'Total unique signal IDs: {len(unique)}')
print()

prefixes = Counter()
for sid in unique:
    prefix = re.match(r'([A-Z]+)', sid).group(1)
    prefixes[prefix] += 1

print('Signal counts by category prefix:')
for prefix, count in sorted(prefixes.items()):
    sigs_in_cat = [s for s in unique if s.startswith(prefix)]
    print(f'  {prefix}: {count} signals ({sigs_in_cat[0]} - {sigs_in_cat[-1]})')

print()
print(f'GRAND TOTAL: {len(unique)} unique signals per page')
print(f'x 100 pages = {len(unique) * 100} total signals across site')
