#!/usr/bin/env python3
"""
三好AI狼人殺 — Blender 3.6+/4.x 清茗茶席建築範本與匯出腳本
================================================================

使用方式（二選一）：
1. Blender 介面模式：
   開啟 Blender -> 切換至「Scripting」分頁 -> 開啟本腳本 -> 點擊「Run Script」。
   場景會建立兩個集合：
   - Sanctuary_Scale_Guides：茶桌、1~8 號座位、清茗主持台與攝影機安全角參考框（匯出時自動排除）
   - Sanctuary_Pavilion_Export：八角書院古亭起始架構（可直接替換或雕刻屋瓦、柱礎、石燈與懸樑）

2. 命令列一鍵建構與匯出 `.glb`：
   blender --background --python tools/blender_sanctuary_guide.py -- --export

匯出路徑預設為 `assets/models/sanctuary_pavilion.glb`。
放進該路徑後，遊戲透過 `server.py` 啟動時 `/api/assets/status` 會自動偵測並載入你的 Blender 古亭，
同時保留遊戲內的互動茶桌、桌面茶具香爐與三好蓮花琉璃核心！

重要空間規格（Z-up Blender 對應 Three.js Y-up，glTF 匯出時勾選 +Y Up）：
- 原點 `(0, 0, 0)` 位於圓形茶桌正下方露台地坪中央
- 露台石階半徑：8.50 m｜胡桃木圓桌半徑：3.25 m｜桌面高度：1.24 m
- 8 人座位半徑：4.85 m（6 人局：4.55 m）
- 古亭立柱環半徑：7.85 m
- 南側前置開口（Open South Bays）：立柱索引 `1` 與 `2`（Three.js +Z 方向）必須維持鏤空視野，
  避免遮擋預設電影運鏡與玩家第一人稱主鏡頭！
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

try:
    import bpy  # type: ignore
except ImportError:  # 允許在純 Python 環境做語法與常數檢查
    bpy = None

# 遊戲世界精準尺度（公尺）
TABLE_RADIUS = 3.25
TABLE_TOP_Y = 1.24
TERRACE_RADIUS = 8.50
PILLAR_RING_RADIUS = 7.85
SEAT_RING_8P = 4.85
SEAT_RING_6P = 4.55
OPEN_SOUTH_BAYS = (1, 2)  # Three.js +Z 鏡頭通道，立柱 1、2 維持敞開
QINGMING_POS_THREE = (2.95, 0.02, -5.45)

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_EXPORT_PATH = ROOT_DIR / "assets" / "models" / "sanctuary_pavilion.glb"


def three_to_blender(x: float, y: float, z: float) -> tuple[float, float, float]:
    """將遊戲 Three.js (Y-up) 座標轉換為 Blender (Z-up)。"""
    return (x, -z, y)


def _ensure_collection(name: str):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    for obj in list(col.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    return col


def _link_only(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)


def _make_principled_mat(name: str, rgba: tuple[float, float, float, float], roughness: float = 0.5, metallic: float = 0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    return mat


def build_sanctuary_template():
    """建立遊戲等比尺度參考框與八角書院古亭起始架構。"""
    if bpy is None:
        raise RuntimeError("請在 Blender 內執行此腳本，或使用 blender --background --python tools/blender_sanctuary_guide.py")

    guides_col = _ensure_collection("Sanctuary_Scale_Guides")
    export_col = _ensure_collection("Sanctuary_Pavilion_Export")

    # 1. 建立不匯出的茶席尺度參考物件
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=TABLE_RADIUS, depth=0.24, location=three_to_blender(0, 1.12, 0))
    table_ref = bpy.context.active_object
    table_ref.name = "GUIDE_Table_325cm"
    table_ref.display_type = "WIRE"
    _link_only(table_ref, guides_col)

    for i in range(8):
        ang = math.pi * 0.5 + (i * math.pi * 2.0) / 8.0
        sx = math.cos(ang) * SEAT_RING_8P
        sz = math.sin(ang) * SEAT_RING_8P
        bpy.ops.object.empty_add(type="ARROWS", radius=0.45, location=three_to_blender(sx, 0.0, sz))
        empty = bpy.context.active_object
        empty.name = f"GUIDE_Seat_0{i + 1}"
        _link_only(empty, guides_col)

    bpy.ops.object.empty_add(type="SINGLE_ARROW", radius=0.8, location=three_to_blender(*QINGMING_POS_THREE))
    qm_empty = bpy.context.active_object
    qm_empty.name = "GUIDE_Qingming_Host_Dais"
    _link_only(qm_empty, guides_col)

    # 2. 建立可自由細化雕刻並匯出成 .glb 的書院古亭建築群
    mat_pillar = _make_principled_mat("Sanctuary_Vermilion", (0.545, 0.149, 0.114, 1.0), roughness=0.36, metallic=0.12)
    mat_wood = _make_principled_mat("Sanctuary_Walnut", (0.36, 0.21, 0.13, 1.0), roughness=0.48, metallic=0.08)
    mat_stone = _make_principled_mat("Sanctuary_Granite", (0.85, 0.83, 0.78, 1.0), roughness=0.72, metallic=0.04)
    mat_tile = _make_principled_mat("Sanctuary_RoofTile", (0.48, 0.14, 0.09, 1.0), roughness=0.46, metallic=0.14)
    mat_gold = _make_principled_mat("Sanctuary_BrassGold", (0.83, 0.65, 0.34, 1.0), roughness=0.25, metallic=0.82)

    pillar_pts = []
    for li in range(8):
        la = (li / 8.0) * math.pi * 2.0 + math.pi / 8.0
        px = math.cos(la) * PILLAR_RING_RADIUS
        pz = math.sin(la) * PILLAR_RING_RADIUS
        pillar_pts.append((px, pz, la))

        if li in OPEN_SOUTH_BAYS:
            continue  # 保持南面入口開放

        # 石柱礎
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.35, depth=0.36, location=three_to_blender(px, 0.18, pz))
        plinth = bpy.context.active_object
        plinth.name = f"Pavilion_Plinth_{li}"
        plinth.data.materials.append(mat_stone)
        _link_only(plinth, export_col)

        # 朱漆木柱
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.15, depth=4.7, location=three_to_blender(px, 2.6, pz))
        post = bpy.context.active_object
        post.name = f"Pavilion_Pillar_{li}"
        post.data.materials.append(mat_pillar)
        _link_only(post, export_col)

        # 飛簷角寶頂
        fx = math.cos(la) * 9.75
        fz = math.sin(la) * 9.75
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.14, location=three_to_blender(fx, 5.42, fz))
        finial = bpy.context.active_object
        finial.name = f"Pavilion_Finial_{li}"
        finial.data.materials.append(mat_gold)
        _link_only(finial, export_col)

    # 3. 欄杆與後側飛簷屋瓦段（跳過南面開口 Bay 1）
    for bi in range(8):
        if bi == 1:
            continue
        ax, az, _ = pillar_pts[bi]
        bx, bz, _ = pillar_pts[(bi + 1) % 8]
        mx, mz = (ax + bx) * 0.5, (az + bz) * 0.5
        span = math.hypot(bx - ax, bz - az)
        yaw = math.atan2(bx - ax, bz - az)

        if bi >= 3 or bi == 7:
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=three_to_blender(mx, 0.96, mz))
            rail = bpy.context.active_object
            rail.name = f"Pavilion_Rail_{bi}"
            rail.scale = (0.14, span - 0.25, 0.08)
            rail.rotation_euler = (0.0, 0.0, -yaw)
            rail.data.materials.append(mat_wood)
            _link_only(rail, export_col)

        if bi >= 3:
            ang_out = math.atan2(-mx, -mz)
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=three_to_blender(mx * 1.09, 5.24, mz * 1.09))
            roof = bpy.context.active_object
            roof.name = f"Pavilion_Roof_{bi}"
            roof.scale = (span + 0.72, 2.05, 0.12)
            roof.rotation_euler = (-0.34, 0.0, ang_out)
            roof.data.materials.append(mat_tile)
            _link_only(roof, export_col)

    return export_col


def export_sanctuary_glb(out_path: Path | str = DEFAULT_EXPORT_PATH) -> Path:
    """只選取 Sanctuary_Pavilion_Export 集合並匯出為標準 Y-up .glb。"""
    if bpy is None:
        raise RuntimeError("需要 Blender 的 bpy 環境才能執行 GLB 匯出。")
    export_col = bpy.data.collections.get("Sanctuary_Pavilion_Export")
    if export_col is None:
        export_col = build_sanctuary_template()

    bpy.ops.object.select_all(action="DESELECT")
    for obj in export_col.objects:
        obj.select_set(True)

    target = Path(out_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(target),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
    )
    return target


if __name__ == "__main__":
    if bpy is not None:
        build_sanctuary_template()
        if "--export" in sys.argv:
            saved = export_sanctuary_glb()
            print(f"[Sanctuary] 已匯出 Blender 古亭場景至：{saved}")
    else:
        print(f"Blender 參考尺度：桌半徑={TABLE_RADIUS}m, 8人席半徑={SEAT_RING_8P}m, 輸出={DEFAULT_EXPORT_PATH}")
