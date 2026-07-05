# Web Lab 1 : 计算机网络基础

## 网络基础

- 先看一个例子👇
``` plaintext
PS C:\Users\18096\Desktop> nslookup www.zju.edu.cn
Server:  UnKnown
Address:  10.10.0.*

Non-authoritative answer:
Name:    www.zju.edu.cn
Address:  10.203.4.*

PS C:\Users\18096\Desktop> nslookup www.zju.edu.cn
Server:  UnKnown
Address:  10.161.220.*

Non-authoritative answer:
Name:    www.zju.edu.cn.queniusa.com
Addresses:  2409:8c34:4400:1000:43::11
          2409:8c34:4400:1000:43::10
          112.48.*.51
          112.48.*.52
          112.48.*.53
          112.48.*.54
          112.48.*.55
          112.48.*.56
          112.48.*.57
          112.48.*.50
Aliases:  www.zju.edu.cn
          www.zju.edu.cn.w.cdngslb.com
```
### 为什么会出现这种区别？
#### 了解一些知识
1. 网络层：IP地址，子网掩码，路由
- IP 设备唯一的数字地址
- 子网掩码 分割IP这串长数字，区别网络地址or主机地址
- 路由 决定数据包如何在不同网络之间传输（规划路线）

2. 应用层：DNS和域名解析 HTTP/HTTPS协议
- DNS(域名系统) 将人类可读的域名转换为IP地址，以便于计算机定位特定的服务器
- 域名解析：本地DNS缓存（如果没有） -> 请求DNS服务器
- HTTP：请求 + 响应结构 请求包括请求方法/请求URL/请求头/请求体 响应包括状态码/响应头/响应体
- HTTPS：HTTP的加密版本，通过加密数据传输/身份验证/数据完整性检验保护数据

3. 传输层：端口 TCP/UDP
- 端口：“计算机上的门”，通向不同的应用程序或服务
- TCP是面向连接的，可靠性高，适用于需要可靠数据传输的应用
- UDP是面向无连接的，传输速度快，适用于实时性要求较高的应用

4. 网络接口层：信号具体的传输方式？（这个不太理解 后续补上）

#### 所以我们可以这样解释
> 在局域网环境下，由内网 DNS 服务器（10.10.0.x）直接解析出浙大核心服务器的内网私有 IP（10.203.4.x）。
> 在切换为公网蜂窝流量后，网络接口层发生改变，电脑向公网 DNS（10.161.220.x）发起请求。结果触发了域名别名（Aliases）机制，指向了 CDN 广域网负载均衡系统，最终返回了 10 个用于分流的公网 IPv4（112.48.x.x）及 IPv6 地址。
> 值得注意的是，流量状态下最终返回的公网IPV4不同时间完全不同（动态机制）

