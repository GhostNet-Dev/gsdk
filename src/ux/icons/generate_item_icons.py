
import os
import re
from collections import defaultdict

# 설정
ROOT_PATH = 'https://hons.ghostwebservice.com/'
# ICONS_DIR = './assets/icons'
ICONS_DIR = 'assets/ui'
OUTPUT_FILE = 'src/gsdk/src/ux/icons/uxicons.ts'
NAME = 'uxIcons'



def to_pascal_case(s: str) -> str:
    name = os.path.splitext(s)[0]
    parts = re.split(r'[\s_\-]+', name)
    cleaned = [''.join(re.findall(r'\w+', part)).capitalize() for part in parts if part]
    return ''.join(cleaned)

def format_entry(name: str, category: str, path: str) -> str:
    return f"""  {name}: {{
    name: '{name}',
    category: '{category}',
    path: '{path}',
  }},"""

def parse_all_icons():
    icons_by_name = defaultdict(list)

    for root, _, files in os.walk(ICONS_DIR):
        for file in files:
            if not file.lower().endswith('.png'):
                continue
            abs_path = os.path.join(root, file)
            rel_path = os.path.relpath(abs_path, ICONS_DIR).replace('\\', '/')
            parts = rel_path.split('/')  # e.g. ['Equipment', 'Heavy', 'Helmet.png']
            category = '_'.join(parts[:-1])
            path_url = f"{ROOT_PATH}{ICONS_DIR}/{'/'.join(parts)}".replace(' ', '%20')
            base_name = to_pascal_case(file)
            folder_keywords = [to_pascal_case(p) for p in parts[:-1]]
            icons_by_name[base_name].append({
                'base_name': base_name,
                'filename': file,
                'folder_keywords': folder_keywords,
                'category': category,
                'url_path': path_url
            })
    return icons_by_name

def find_unique_suffix(icon, group):
    """group 내에서 유일한 키워드를 찾기"""
    for keyword in icon['folder_keywords'][::-1]:  # 가장 가까운 폴더부터 검사
        count = sum(1 for i in group if keyword in i['folder_keywords'])
        if count == 1:
            return keyword
    return None

def collect_icons():
    icons = []
    used_keys = set()
    icons_by_name = parse_all_icons()

    for base_name, group in icons_by_name.items():
        for icon in group:
            candidate = base_name

            if len(group) > 1:
                suffix = find_unique_suffix(icon, group)
                if suffix:
                    candidate = f"{base_name}_{suffix}"
                else:
                    # fallback: 전체 경로 붙이기
                    candidate = f"{base_name}_" + '_'.join(icon['folder_keywords'])

            if candidate in used_keys:
                raise ValueError(f"❌ 중복 키 발생: {candidate}")
            used_keys.add(candidate)

            icons.append(format_entry(candidate, icon['category'], icon['url_path']))

    return icons

def generate_ts_file(icons):
    header = f"""const rootPath = '{ROOT_PATH}'

export const {uxIcons} = {{
"""
    body = '\n'.join(sorted(icons))
    footer = """
} as const

"""
    return header + body + footer

def main():
    icons = collect_icons()
    content = generate_ts_file(icons)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ Generated {len(icons)} icons → {OUTPUT_FILE}")

if __name__ == '__main__':
    main()