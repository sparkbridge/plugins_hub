from PIL import Image, ImageDraw

def create_checkmark(filename="check.png", size=(60, 60)):
    """生成一个背景透明的红色对勾图片"""
    # 创建一张 RGBA 图片，背景完全透明 (0,0,0,0)
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 红色对勾的颜色 (红, 绿, 蓝, 透明度) -> 纯红且完全不透明
    red_color = (255, 0, 0, 255)
    line_width = 5
    
    # 定义对勾的三个顶点坐标
    # 假设图片大小是 60x60
    # 左侧起点
    point1 = (15, 30)
    # 底部转折点
    point2 = (25, 45)
    # 右侧终点
    point3 = (50, 15)
    
    # 绘制两条线段组成对勾
    # 也可以使用 draw.line([point1, point2, point3], fill=red_color, width=line_width, joint="curve")
    draw.line([point1, point2], fill=red_color, width=line_width)
    draw.line([point2, point3], fill=red_color, width=line_width)
    
    img.save(filename)
    print(f"✅ 透明对勾已生成: {filename}")

create_checkmark()