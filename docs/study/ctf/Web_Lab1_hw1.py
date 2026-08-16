import requests
import json
import time  # 引入时间库，用于控制访问频率

url = "https://zdbk.zju.edu.cn/jwglxt/cxdy/xscjcx_cxXscjIndex.html?doType=query&gnmkdm=N5083&su=3250102349"

headers = {
    "Host": "zdbk.zju.edu.cn",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Accept-Language": "zh-CN,zh;q=0.9",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    "Origin": "https://zdbk.zju.edu.cn",
    "Referer": "https://zdbk.zju.edu.cn/jwglxt/cxdy/xscjcx_cxXscjIndex.html?gnmkdm=N5083&layout=default&su=3250102349",
    "Connection": "keep-alive",
    "Cookie": "JSESSIONID=D9BF26B2BBCB776359D36BEA31E7071B; JSESSIONID=3B006115A22F067C7C220EDCC6858DC7; route=78347236f96598ad781aede801673cbb; _csrf=S8mwplVi9KWoF2WQ0TlCeJfmU%2FzNk3bW3hoXPp%2BPe%2Bc%3D; _pv0=%2BgE9XtnsZ53JIAgJrDpxpZ9vOg9q61Ems3fjqojd25Bqn46aeziJwnRPykuYDXH1VkNnuShQZXqVj4zcAR%2Fkd%2BAnGH6ROoZpN3jj%2BzhXOQ%2FNQ3jYbVDEjoFn9EdLj%2F49uv%2BqKCBzadjI%2BZFP29Rybd7H6obNvxqV7CzrF1vyoWbnWTlnXLN0ufXWgvsBsmbmss7xyqPurpvI2RZP%2FkJ51h9vKhc8EB%2BocjU8J7%2BfG%2BQABcukselp2%2FHV20HXdStSRNVSR%2F0JRYIE7wf7nuT4xzD1i8lgQW88e%2BS%2BoOIayzRR2Tu69djyVtW1b7RGUjxue2Z0H1%2FGjM3nCvns2lfbl%2FqTyhugnFCC8iKWv7Z8u7pH95iPPYloPyZlwOPnwdK4C%2BsqJKTekKBv%2FSn%2BysDANB5jZ8gHtN%2Fg1uWwxlRsue8%3D; _pf0=Px93rNbNjb01DekYdK44LVqRst7wup36j8EOxS4Ovfo%3D; _pc0=TQvX4uuYnsR0uBo%2F4twXnp8IbjPdh015D99kta5Z8aFcW5gliT3EGiurmiv3rWcv; iPlanetDirectoryPro=tNlvKXAGztY5MNP7SPMYxhp8d7dJr5pyBN8nItw0%2FQCxY%2F9uplUB5NGhLlefa6MaVlH6ikuiDaVjmoMWNMFgqPuRqPJqU9BG31owxhWt%2FLhn8psmnvMM%2FJ4q9MEWqvKBHUZu8kU60iAaX403OVq3lb3bP91ltVT2i%2B5TNNBmYkgFAdGSNnLmpv24MkIY0ZVOkzbNvAlwZ1Nd%2Fz%2F8aVjoaku5N12bgxqnKV6xr1hJaoH%2Bx%2BT96KxUlvIfSYAuM2mFbLaV2kpXt2N25eAKgICV5kZAQ96LosrTiCvfTDGcR%2FBfWuIWqUuCswhCDcVivpmtv7JWxiaW5Vjs1BREH2uwM4%2FEnrEfLwI3yoCLs959qjg%3D"
}

# 基础表单数据
data = {
    "xn": "",
    "xq": "",
    "zscjl": "",
    "zscjr": "",
    "_search": "false",
    "nd": "1783316578701",
    "queryModel.showCount": "15",
    "queryModel.sortName": "xkkh",
    "queryModel.sortOrder": "asc",
    "time": "0"
    # 注意：这里拿掉了固定 currentPage，我们要在循环中动态赋值
}

page = 1
all_courses_count = 0

print("================ 自动翻页爬取成绩 ================")

while True:
    print(f"\n正在尝试抓取第 {page} 页...")
    
    # 动态更新当前页码（注意教务系统接收的是字符串格式）
    data["queryModel.currentPage"] = str(page)
    
    try:
        response = requests.post(url, headers=headers, data=data, timeout=10)
        result_json = response.json()
        
        # 获取当前页的课程列表
        items = result_json.get("items", [])
        
        # 🚨 核心判断 1：如果这一页没有返回任何课程数据，说明已经翻到头了
        if not items:
            print(f"第 {page} 页没有数据了，翻页结束。")
            break
            
        print(f"--- 第 {page} 页成绩单 ---")
        for item in items:
            kcmc = item.get("kcmc", "未知课程")
            cj = item.get("cj", "暂无")
            xf = item.get("xf", "0.0")
            jd = item.get("jd", "0.0")
            print(f"课程: {kcmc:<14} | 学分: {xf} | 绩点: {jd} | 成绩: {cj}")
            all_courses_count += 1
            
        # 🚨 核心判断 2（可选）：对比系统返回的总条数。如果已抓取条数 >= 系统总条数，也可以提前退出
        total_result = int(result_json.get("totalResult", 0))
        if all_courses_count >= total_result:
            print(f"\n已抓取全部数据（共 {all_courses_count}/{total_result} 条），正在退出...")
            break
            
        # 准备爬取下一页
        page += 1
        
        # ⏳ 频率控制：作业要求“注意访问频率控制，不要对服务器造成过大压力”。
        # 每一页请求完，让程序“休息” 1 秒钟，优雅且安全。
        time.sleep(1)

    except json.JSONDecodeError:
        print("解析 JSON 失败。可能 Cookie 已过期，或者受到了学校限制。")
        break
    except Exception as e:
        print(f"请求过程中发生错误: {e}")
        break

print(f"\n================ 爬取完成，共计 {all_courses_count} 门课程 ================")