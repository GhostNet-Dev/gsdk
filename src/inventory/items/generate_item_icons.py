
import os
import re

# 설정
ROOT_PATH = 'https://hons.ghostwebservice.com/assets/'
ICONS_DIR = './assets/icons'
OUTPUT_FILE = './src/gsdk/src/inventory/items/itemicons.ts'

def format_entry(name, category, path):
    return f"""  {name}: {{
    name: '{name}',
    category: '{category}',
    path: '{path}',
  }},"""

def to_pascal_case(filename: str) -> str:
    # 확장자 제거
    name = os.path.splitext(filename)[0]

    # 공백, 하이픈, 밑줄 등을 기준으로 분할하고 알파벳만 추출하여 PascalCase로 변환
    parts = re.split(r'[\s_\-]+', name)
    cleaned = [''.join(re.findall(r'\w+', part)).capitalize() for part in parts if part]
    return ''.join(cleaned)

def collect_icons():
    icons = []

    for category in os.listdir(ICONS_DIR):
        category_path = os.path.join(ICONS_DIR, category)
        if not os.path.isdir(category_path):
            continue

        for file in os.listdir(category_path):
            if file.lower().endswith('.png'):
                name = to_pascal_case(file)
                full_path = f"{ROOT_PATH}icons/{category}/{file.replace(' ', '%20')}"
                icons.append(format_entry(name, category, full_path))
    return icons
def generate_ts_file(icons):
    header = f"""const rootPath = '{ROOT_PATH}'

export const itemIcons = {{
"""
    body = '\n'.join(icons)
    footer = """
} as const

export type ItemIconKey = keyof typeof itemIcons
export type IconCategory = typeof itemIcons[ItemIconKey]['category']
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
