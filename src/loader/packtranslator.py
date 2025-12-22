import os

# 설정: 파일이 있는 디렉토리 및 출력 파일
input_directory = "assets/kaykit/medieval_hexagon_pack/decoration/props"
output_file = "generated_classes.ghost"
pack_name = "KaykitMedHexagonDecorationPropsPackFab"
front_name = "KaykitMedHexagonDecorationPropsPack"
exe_name = ".fbx"

# 파일 리스트 가져오기 및 정렬
fbx_files = sorted([f for f in os.listdir(input_directory) if f.endswith(exe_name)])
print(f"{fbx_files}")

# 언더스코어(_)를 제거하고, CamelCase로 변환하는 함수
def format_class_name(filename):
    name_without_ext = filename.replace(exe_name, "")
    parts = name_without_ext.split("_")
    formatted_name = "".join(part.capitalize() for part in parts)  # 각 부분을 대문자로 변환
    return formatted_name

# TypeScript 코드 생성
def generate_class_code(filename):
    formatted_name = format_class_name(filename)
    class_name = front_name + formatted_name + "Fab"
    id_name = "Char."+front_name + formatted_name
    return (f"export class {class_name} extends {pack_name} implements IAsset {{\n"
            f"    get Id() {{return {id_name}}}\n"
            f"    constructor(loader: Loader) {{ super(loader, \"{input_directory}/{filename}\") }}\n"
            f"}}\n")
def generate_enum_code(filename):
    formatted_name = format_class_name(filename)
    id_name = front_name + formatted_name
    return (f"{id_name},")

def generate_loader_code(filename):
    formatted_name = format_class_name(filename)
    class_name = front_name + formatted_name + "Fab"
    id_name = "Char."+front_name + formatted_name
    return (f"this.fabClasses.set({id_name}, {class_name});")

def generate_import_code(filename):
    formatted_name = format_class_name(filename)
    class_name = front_name + formatted_name + "Fab"
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

