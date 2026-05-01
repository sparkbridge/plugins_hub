from PIL import Image, ImageDraw, ImageFont

def generate_dynamic_background():
    width = 540
    height = 630
    img = Image.new('RGB', (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    font_path = "simhei.ttf" 
    try:
        font_title = ImageFont.truetype(font_path, 32)
        font_sub = ImageFont.truetype(font_path, 22)
        font_week = ImageFont.truetype(font_path, 20)
    except IOError:
        print("❌ 找不到字体文件")
        return

    # 【改动点】：不画时间，只画“签到”，并且向右偏移到 X=170，给前面的时间留白
    draw.text((170, 30), "签到", font=font_title, fill=(0, 0, 0))
    draw.text((30, 75), "下次一定", font=font_sub, fill=(80, 80, 80))
    
    days = ["日", "一", "二", "三", "四", "五", "六"]
    cell_w, pad_x, start_x, start_y_week = 60, 10, 30, 135
    
    for i, day in enumerate(days):
        center_x = start_x + i * (cell_w + pad_x) + (cell_w / 2)
        bbox = draw.textbbox((0, 0), day, font=font_week)
        draw.text((center_x - (bbox[2] - bbox[0]) / 2, start_y_week), day, font=font_week, fill=(50, 50, 50))
        
    output_name = "base_board_dynamic.jpg"
    img.save(output_name)
    print(f"✅ 动态底板已生成：{output_name}")

if __name__ == "__main__":
    generate_dynamic_background()