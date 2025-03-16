import os

# 설정: 파일이 있는 디렉토리 및 출력 파일
input_directory = "assets/kaykit/dungeon_pack/fbx"
output_file = "generated_classes.ghost"

# 파일 리스트 가져오기
fbx_files = [f for f in os.listdir(input_directory) if f.endswith(".fbx")]

# TypeScript 코드 생성
def generate_class_code(filename):
    class_name = "KayKitDungeon" + filename.replace(".fbx", "").replace("_", "") + "Fab"
    id_name = "Char.KayKitDungeon" + filename.replace(".fbx", "").replace("_", "")
    return (f"export class {class_name} extends KayKitDungeonPack implements IAsset {{\n"
            f"    get Id() {{return {id_name}}}\n"
            f"    constructor(loader: Loader) {{ super(loader, \"{input_directory}/{filename}\") }}\n"
            f"}}\n")
def generate_enum_code(filename):
    id_name = "KayKitDungeon" + filename.replace(".fbx", "").replace("_", "")
    return (f"{id_name},")

def generate_loader_code(filename):
    class_name = "KayKitDungeon" + filename.replace(".fbx", "").replace("_", "") + "Fab"
    id_name = "Char.KayKitDungeon" + filename.replace(".fbx", "").replace("_", "")
    return (f"this.fabClasses.set({id_name}, {class_name});")

def generate_import_code(filename):
    class_name = "KayKitDungeon" + filename.replace(".fbx", "").replace("_", "") + "Fab"
    return (f"{class_name}")
# 모든 클래스를 하나의 파일에 저장
with open(output_file, "w", encoding="utf-8") as f:
    for file in fbx_files:
        f.write(generate_class_code(file) + "\n")
    for file in fbx_files:
        f.write(generate_enum_code(file) + "\n")
    for file in fbx_files:
        f.write(generate_loader_code(file) + "\n")
    for file in fbx_files:
        f.write(generate_import_code(file) + ", ")

print(f"{output_file} 파일이 생성되었습니다.")

