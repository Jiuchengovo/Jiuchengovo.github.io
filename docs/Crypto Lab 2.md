# Crypto Lab 2 — 完整解题 Writeup

> 共 6 道题：RSA Party（6 合一）、KillerECC、EZcopper、EZDLP、EZHNP、Regev

---

## 目录

1. [RSA Party（6 合 1）](#一rsa-party6-合-1)
2. [KillerECC](#二killerecc)
3. [EZcopper](#三ezcopper)
4. [EZDLP](#四ezdlp)
5. [EZHNP](#五ezhnp)
6. [Regev](#六regev)

---

## 一、RSA Party（6 合 1）

> Flag: `ZJUCTF{?!Rs@_MA$TEr!?}`

服务器依次给出 6 道 RSA 变种题，解出后得 flag。有 PoW（SHA256 4 字符爆破）。

### 1/6: Fermat Factorization

**漏洞**：$p, q$ 很接近。$N = pq = a^2 - b^2$，从 $a = \lceil\sqrt{N}\rceil$ 开始搜索。

### 2/6: Pollard p-1

**漏洞**：$p-1$ 平滑。$M = \operatorname{lcm}(1,\dots,B)$，$\gcd(a^M - 1, N) = p$。

### 3/6: Common Modulus

**漏洞**：同一 $N$ 用互质 $e_1=3, e_2=17$ 加密。$m = c_1^a \cdot c_2^b \pmod{N}$，其中 $ae_1+be_2=1$。

### 4/6: Hastad Broadcast

**漏洞**：$e=3$，3 个不同 $N$。CRT 求 $m^3$ 再开三次方。

### 5/6: Franklin-Reiter

**漏洞**：$e=3$，加密 $m$ 和 $m+\text{pad}$。多项式 GCD 消去 $x^3$ 项得一次方程。

### 6/6: Wiener

**漏洞**：$d < N^{1/4}$。$\frac{k}{d}$ 是 $\frac{e}{N}$ 的连分数收敛。

### RSA 攻击速查

| 攻击 | 条件 | 关键 |
|------|------|------|
| Fermat | $p,q$ 接近 | $N=a^2-b^2$ |
| Pollard p-1 | $p-1$ 平滑 | $\gcd(a^M-1,N)$ |
| Common Modulus | 互质 $e_1,e_2$ | 扩展欧几里得 |
| Hastad | 小 $e$, 多个 $N$ | CRT+开方 |
| Franklin-Reiter | 相关明文, 小 $e$ | 多项式 GCD |
| Wiener | $d<N^{1/4}$ | 连分数 |

---

## 二、KillerECC

> Flag: `ZJUCTF{eLl1PTiC_6_6_0_was_nOt_fIn3}`

### 漏洞：elliptic 6.6.0 负数 nonce 重用

`elliptic@6.6.0` 的 `sign()` 接受负数消息，`"-1"` 和 `"1"` 产生**相同 nonce $k$** 但不同 hash。

Nonce 重用 → 私钥泄漏：
$$k = (h_1 - h_2)(s_1 - s_2)^{-1} \bmod n$$
$$d = r^{-1}(s_1 k - h_1) \bmod n$$

### 攻击

1. `sign("-1")` → $(r, s_1)$, $h_1 = n-1$
2. `sign("1")` → $(r, s_2)$, $h_2 = 1$
3. $r$ 相同 → $d$ 直接算出

### 知识点

- **ECDSA**：$s = k^{-1}(h + rd)$，$k$ 重用即私钥泄漏
- **RFC 6979**：确定性 nonce，但 elliptic 6.6.0 实现有 bug
- **CVE-2024-48948**：负数/字符串输入触发 nonce 重用

---

## 三、EZcopper

> Flag: `ZJUCTF{y0u_HavE_l3@rnt_thE_coppER$miTH_m37hod_sO_c13VEr!!!!}`

### 题目

$c_1 = m^p \bmod N,\; c_2 = m^q \bmod N$，已知 $N=pq$、$c_1$、$c_2$，求 $m$。

### 核心推导

### 深入理解：从 FLT 到 GCD 分解

**第一层（FLT 应用）**：

由费马小定理 $a^p \equiv a \pmod{p}$：
$$c_1 = m^p \bmod N \;\Rightarrow\; c_1 \equiv m^p \equiv m \pmod{p}$$
$$c_2 = m^q \bmod N \;\Rightarrow\; c_2 \equiv m^q \equiv m \pmod{q}$$

**第二层（指数运算，不依赖知道 $p$）**：

计算 $c_1^N \bmod p$，利用 $N = pq$：
$$c_1^N = (m^p)^{pq} = m^{p^2 q}$$

分离出一个 $m^{p-1}$（其 ≡ 1 mod p）：
$$m^{p^2 q} = m^q \cdot m^{p(p-1)q} = m^q \cdot (m^{p-1})^{pq} \equiv m^q \cdot 1^{pq} = m^q \pmod{p}$$

**第三层（GCD 一步分解）**：

$$\boxed{\gcd(N,\; c_1^N - c_2) = p}$$

因为 $c_1^N \equiv c_2 \pmod{p}$ 所以 $p \mid c_1^N - c_2$。以压倒性概率，$q \nmid c_1^N - c_2$。

得到 $p, q$ 后：$m = c_1 \bmod p = c_2 \bmod q$。由于 $m$ 是 480-bit 的 flag，$p$ 是 512-bit，$m < p$ 自然成立，$c_1 \bmod p$ 就是 $m$ 本身。

```python
p = math.gcd(N, pow(c1, N, N) - c2)  # 一步分解
m = c1 % p                              # 直接得到 m
flag = long_to_bytes(m)
```

### 知识点

| 知识点 | 说明 |
|--------|------|
| 费马小定理 | $a^p \equiv a \pmod{p}$（对所有整数 $a$）|
| 模幂化简 | $c_1^N \bmod p$ 通过 FLT 化简为 $m^q \bmod p$ |
| GCD 分解 | $\gcd(N, c_1^N - c_2)$ 直接得 $p$（一步到位）|
| 题名暗示 | "EZcopper" → Coppersmith 也可解（$(c_1-x)(c_2-x) \equiv 0 \pmod N$ 的小根），但 GCD 法更优雅 |

---

## 四、EZDLP

> Flag: `ZJUCTF{poHl19_h3L1m@n_al6O!?}`

### 深入理解：为什么 DLP 通常困难

离散对数 $c = g^x \bmod p$ 的困难性在于"指数"掩盖了 $x$。对于随机 512-bit 素数 $p$，$p-1$ 至少含一个大素数因子。Pohlig-Hellman 把 DLP 分解到各素数幂子群上，但**最大的那个子群的阶**决定了总复杂度。若最大素因子是 $2^{400}$ 量级，则必须用 Pollard-$\rho$（$O(2^{200})$），不可行。

### 本题的关键：极度光滑的 $p-1$

$$p - 1 = 2^{518}$$

$p-1$ 的素因子分解中**只有 2**。$x$ 可直接写成二进制：

$$x = x_0 + x_1 \cdot 2 + x_2 \cdot 2^2 + \cdots + x_{517} \cdot 2^{517}$$

### Pohlig-Hellman 在 2-群上的逐比特恢复

群 $\mathbb{F}_p^*$ 的阶是 $2^{518}$（2-群）。$g=3$ 是生成元（验证：$3^{2^{517}} \equiv -1 \pmod{p}$，Legend 符号为 $-1$）。

**第 $i$ 轮**（已知低 $i$ 位 $x_0,\dots,x_{i-1}$，求 $x_i$）：

令 $y_i = y_{i-1} \cdot g^{-x_{i-1}\cdot 2^{i-1}} \bmod p$（除去已确定的低位）。此时 $y_i = g^{2^i \cdot (x_i + 2x_{i+1} + \cdots)}$。

计算 $y_i^{2^{517-i}} \bmod p$：
$$y_i^{2^{517-i}} = g^{2^{517} \cdot (x_i + 2x_{i+1} + \cdots)} = (g^{2^{517}})^{x_i} \cdot (g^{2^{518}})^{\cdots}$$

因为 $g^{2^{518}} = 1$：
$$y_i^{2^{517-i}} = (-1)^{x_i}$$

- 结果为 $1$ → $x_i = 0$
- 结果为 $p-1 \equiv -1$ → $x_i = 1$

总共 518 次模幂运算，每次指数减半。复杂度 $O(\log p)$，瞬间完成。

```python
for i in range(518):
    val = pow(y, n // (2**(i+1)), p)
    if val == p-1:        # = -1 mod p → bit_i = 1
        x |= (1 << i)
        y = (y * pow(3, -(1<<i), p)) % p
```

### 知识点

| 知识点 | 说明 |
|--------|------|
| Pohlig-Hellman | 将 DLP 分解到 $p-1$ 的素数幂子群，CRT 合并 |
| 光滑阶 | $p-1$ 的小素因子使 DLP 退化——极端是 $2^k$，逐位判定 |
| 2-群 DLP | $(-1)^{x_i} = y_i^{2^{517-i}}$，每位对应一次 Legendre 符号 |
| DLP 的困难根源 | $p-1$ 含大素数 → 大素数阶子群 → 需 Pollard-$\rho$ 等通用方法 |

---

## 五、EZHNP

> Flag: `ZJUCTF{HNP_atT4cK_D$A}`

### 题目

secp256k1，18 个相同消息的 ECDSA 签名，nonce $k_i$ 为 240-bit prime（比 $n \approx 2^{256}$ 少 16 bits）。

### 方法：HNP + BKZ

$$k_i \equiv a_i \cdot sk + b_i \pmod{n},\quad |k_i| < 2^{240}$$

1. 消去 $sk$：$k_j \equiv c_j \cdot k_0 + d_j \pmod{n}$，**所有变量 $< 2^{240}$**
2. 构建 19 维 Kannan 嵌入格
3. **fpylll BKZ-10** 找到 $(k_1,\dots,k_{17},k_0,K)$ 短向量
4. $sk = (k_0 - b_0) \cdot a_0^{-1} \bmod n$

```python
from fpylll import IntegerMatrix, LLL, BKZ

dim = 19
B = IntegerMatrix(dim, dim)
# ... fill basis ...
LLL.reduction(B)
BKZ.reduction(B, BKZ.Param(10))
# find row with last = ±K → extract k_0 → sk
```

### 深入理解：为什么 HNP 可以用格求解

HNP 的核心是寻找一个数 $sk$，使得 18 个不同的线性函数同时落在"小"区间内：

$$a_i \cdot sk + b_i \pmod{n} \in [-K, K]$$

**直觉**：如果没有 $sk$ 的约束，$a_i \cdot sk \bmod n$ 在 $[0, n-1]$ 上均匀分布。落在一个宽 $2K$ 的窗口内的概率是 $2K/n \approx 2^{241}/2^{256} = 2^{-15}$。18 个方程同时满足的概率是 $2^{-270}$，说明满足条件的 $sk$ **唯一存在**。

**格的视角**：同余式 $a_i \cdot sk + b_i \equiv k_i \pmod{n}$（$|k_i| < K$）可改写为：

$$a_i \cdot sk + b_i - m_i n = k_i$$

其中 $m_i$ 是整数。两边对所有 $i$ 成立。这意味着向量 $(k_0, \dots, k_{17}, sk)$ 是由行向量 $(0,\dots,n,\dots,0)$, $(a_0,\dots,a_{17},1)$, $(b_0,\dots,b_{17},0)$ 的**整数线性组合**——所以它是格中的点。

Kannan 嵌入把寻找这个格点的 **CVP**（最近向量问题）转化为 **SVP**（最短向量问题），在格基上再拼一行，使得最靠近目标向量的格点恰好对应最短的格向量。

**BKZ 为什么比 LLL 强**：LLL 只对相邻两行做交换判断（"2-约简"）。BKZ-$\beta$ 对 $\beta$ 行的子块做 Hermite 约简，能更彻底地"梳理"格基。对于本题的 19 维格，BKZ-10 已经足够找到范数 $\approx 2^{242}$ 的目标向量。

### 知识点

| 概念 | 说明 |
|------|------|
| Hidden Number Problem | $a_i x + b_i \equiv k_i \pmod{n}$，$|k_i| < K$，格基约简求 $x$ |
| 概率论证 | $P(|a_i x + b_i|_n < K) \approx 2K/n$，18 方程保证唯一解 |
| Kannan 嵌入 | CVP → SVP：多加一行，目标向量变成格中的短向量 |
| BKZ vs LLL | BKZ-$\beta$ 对 $\beta$ 维子块约简，比 LLL（$\beta=2$）更强 |
| fpylll | Python 绑定的 C++ fpLLL 库，浮点 Gram-Schmidt，远优于纯整数 LLL |

---

## 六、Regev

> Flag: `ZJUCTF{LLL_60_brrrr}`

### 题目

经典 **LWE**（Learning With Errors），Oded Regev 2005 年提出，是后量子密码学最重要的数学基础之一。

$$b = A \cdot s + e \pmod{q}$$

- $s \in \{0,1\}^{100}$：**二进制**秘密（100 维）
- $e \in \{-1,0,1\}^{150}$：**三元**误差（150 维）
- $q = 1048583 \approx 2^{20}$：小模数
- $m = 150 > n = 100$：超定系统
- $A$ 随机，已知；$b$ 已知；求 $s$（解密密钥）

### 深入理解：LWE 为什么困难

LWE 的困难性来自两方面：

1. **模 $q$ 运算**：$A \cdot s + e \pmod{q}$ 中模约简抹去了和的高位信息
2. **误差项 $e$**：即使模 $q$ 是线性变换，误差 $e$ 使方程不再精确成立

二者的组合创造了一个看似矛盾的局面：
- **没有误差**：$b = A \cdot s \pmod{q}$ 是线性方程组，高斯消元秒解
- **没有模约简**：$b = A \cdot s + e$（整数），最小二乘近似即可
- **两者都有**：即 **LWE**，目前已知最好攻击是格基约简

### 为什么局部搜索失败

本题尝试了模拟退火和 MILP，全部失败。原因：$A$ 的每一项高达 $10^6$，翻转 $s$ 的任意一位会使**所有** 150 个方程的残差发生巨大变化，目标函数的"地形"极度崎岖——除非已经非常接近真解，否则 $|e| \le 1$ 的约束无一满足。这就是 LWE 的"平均情况最坏情况"困难性。

### 方法：Kannan 嵌入（uSVP 归约）

**核心思想**：将 LWE 的求解转化为格中的**唯一最短向量问题（unique-SVP）**。

定义格：
$$\mathcal{L} = \{(x, y, z) \in \mathbb{Z}^n \times \mathbb{Z}^m \times \mathbb{Z} : A\cdot x + y \equiv z\cdot b \pmod{q}\}$$

维度 $d = n + m + 1 = 251$。这个格包含一个**异常短**的向量 $(s, e, 1)$：

$$\|(s, e, 1)\| = \sqrt{\sum_{j=1}^{100} s_j^2 + \sum_{i=1}^{150} e_i^2 + 1} \le \sqrt{100 + 150 + 1} \approx 15.8$$

**Gauss 启发式**预测随机 251 维格中（行列式 $q^{m} \approx 10^{900}$）最短向量约为：
$$\lambda_1 \approx \sqrt{\frac{251}{2\pi e}} \cdot q^{m/d} \approx 3.0 \cdot (10^6)^{150/251} \approx 12000$$

**差距**：$\lambda_1(\text{random}) / \|(s,e,1)\| \approx 12000 / 16 \approx 750$ 倍。

对于唯一 SVP，只要 $\lambda_2 / \lambda_1$ 足够大，格基约简就能把最短向量"挤"到第一个基向量的位置。750 倍的差距意味这极其容易。

**格基构造**：
$$B = \begin{bmatrix} q\cdot I_m & \mathbf{0} & \mathbf{0} \\ -\mathbf{A}^T \bmod q & I_n & \mathbf{0} \\ \mathbf{b} & \mathbf{0} & 1 \end{bmatrix}$$

- 前 $m$ 行：$(q\mathbf{e}_i, \mathbf{0}, 0)$，满足 $A\cdot\mathbf{0} + q\mathbf{e}_i \equiv 0 \pmod{q}$
- 中 $n$ 行：$(-A[:,j] \bmod q,\; \mathbf{e}_j,\; 0)$，满足 $A\cdot\mathbf{e}_j + (-A[:,j]) \equiv 0$
- 末行：$(\mathbf{b}, \mathbf{0}, 1)$，满足 $A\cdot\mathbf{0} + \mathbf{b} \equiv 1\cdot\mathbf{b}$

目标向量的线性组合为：
$$(s,e,1) = 1\cdot(\mathbf{b},\mathbf{0},1) + \sum_{j} s_j\cdot(-A[:,j],\mathbf{e}_j,0) + \sum_i k_i\cdot(q\mathbf{e}_i,\mathbf{0},0)$$

其中 $k_i$ 是模约简产生的 wrap count。

### 为什么 $\delta=0.99$ 是关键

LLL 的 **Lovász 条件**控制着约简的质量：
$$\delta \cdot \|\mathbf{b}_{k-1}^*\|^2 \le \|\mathbf{b}_k^*\|^2 + \mu_{k,k-1}^2 \|\mathbf{b}_{k-1}^*\|^2$$

- $\delta = 0.75$（理论最小值）：约简最激进，但在 251 维上"信息衰减"太快，找到的 |b0| 停留在 $3.5q$
- $\delta = 0.99$：每步交换更保守，整个格基被更均匀地"梳理"，最终 |b0| = 12 直接命中目标

直觉上，高维 LLL 就像把一堆长短不一的棍子反复比较交换。$\delta$ 大意味着"交换的门槛更高"，每次交换的改善更大，最终所有棍子更整齐——第一条最短。

| $\delta$ | 结果 |
|----------|------|
| 0.75（默认） | |b0| 停留在 $3.5q \approx 3.6 \times 10^6$ |
| **0.99** | **|b0| = 12，直接命中目标** |

### 尝试过的失败方法

| 方法 | 失败原因 |
|------|----------|
| 模拟退火（5 万轮） | 每位翻转改变所有残差，0/150 方程满足 |
| MILP / CBC（10 分钟） | 100 二进制变量，10 万节点无可行解 |
| 对偶格 + 浮点求解 | $V\!\cdot\!e = rhs$ 病态（cond ≈ $3\times10^5$），浮点解完全错误 |
| Kannan + $\delta$=0.75 | 高维 LLL 信息衰减，251 维不收敛 |
| **Kannan + $\delta$=0.99** | ✅ |b0| = 12，秒出 |

### 知识点

| 概念 | 说明 |
|------|------|
| LWE | Regev 2005，后量子密码学基石。$b = As + e \pmod{q}$ |
| 模约简 + 误差 = 困难 | 缺一模约简→线性方程；缺一误差→最小二乘；两者都有一→LWE |
| Kannan 嵌入 | LWE → uSVP：将 $(s,e,1)$ 嵌入为格中超短向量 |
| uSVP | $\lambda_2/\lambda_1 \approx 750 \gg 1$，极易用格基约简求解 |
| LLL $\delta$ 参数 | $\delta \in (0.25, 1)$，高维 uSVP 需 $\delta \approx 0.99$ |
| Gauss 启发式 | $\lambda_1 \approx \sqrt{d/(2\pi e)} \cdot \det(L)^{1/d}$，用于判断 SVP 难度 |
| 对偶格攻击的局限 | 短向量仅张成 50 维子空间，远不足以确定 150 维误差 |

### 尝试过的失败方法

| 方法 | 失败原因 |
|------|----------|
| 模拟退火 | 位翻转改变所有残差，无梯度 |
| MILP (CBC 10min) | 100 二进制变量，10 万节点无解 |
| 对偶格 + 浮点 | 病态矩阵 cond ≈ $3\times10^5$ |
| Kannan + $\delta$=0.75 | 251 维不收敛 |

### 知识点

| 概念 | 说明 |
|------|------|
| LWE | Regev 2005，后量子密码学基石 |
| Kannan 嵌入 | LWE → uSVP：$(s,e,1)$ 是极短向量 |
| uSVP | $\lambda_2/\lambda_1 \approx 750 \gg 1$ → 极易求解 |
| LLL $\delta$ | $\delta=0.99$ 对高维 uSVP 至关重要 |

---

## 工具链总结

### 为什么需要 WSL + fpylll

| 环境 | LLL 实现 | EZHNP (19维) | Regev (251维) |
|------|----------|-------------|---------------|
| Windows olll | `olll.reduction` | 太慢 | 太慢 |
| Windows sympy | `Matrix.lll()` | assertion 错误 | 太慢 |
| WSL flint | `fmpz_mat.lll()` | 未找到目标 | |b0|=q |
| **WSL fpylll** | `LLL`/`BKZ` | **BKZ-10 ✅** | **LLL $\delta$=0.99 ✅** |

Python 纯整数 LLL 在维度 > 20 时质量严重下降。fpylll（C++ fpLLL）使用浮点 Gram-Schmidt，在高维和大系数下远优于纯整数实现。

### 各题工具汇总

| 题目 | 工具 | 核心参数 |
|------|------|----------|
| RSA Party | Python | 纯数学 |
| KillerECC | netcat + Python | 纯代数 |
| EZcopper | Python | $\gcd(N, c_1^N-c_2)$ |
| EZDLP | Python | $p-1 = 2^{518}$ |
| EZHNP | **fpylll BKZ** | 19 维，BKZ-10 |
| Regev | **fpylll LLL** | 251 维，$\delta=0.99$ |

---

*Writeup by Claude Code | 2026-07-29*
