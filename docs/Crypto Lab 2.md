# Crypto Lab 2

## Task 1 RSA Party

!!! success "Flag: `ZJUCTF{?!Rs@_MA$TEr!?}`"

### 题目描述

服务器依次给出 6 道 RSA 变种题，每道题需要解出明文 $m$（以十六进制提交），全部通过可以获得flag。也就是说这道题需要掌握常见的 RSA 漏洞及其对应的攻击方式。
解题前还有一个 4 位字母数字的 PoW，回答正确后可以进入正式题目（SHA256 爆破，无法破译，只能暴力枚举约 62^4 次，大概需要几秒）

### RSA 回顾

#### 密钥生成

1. 随机选取两个大素数 $p$ 和 $q$
2. 计算模数 $N = p \times q$
3. 计算欧拉函数 $\varphi(N) = (p-1)(q-1)$
4. 选取公钥指数 $e$（满足 $1 < e < \varphi(N)$ 且 $\gcd(e, \varphi(N)) = 1$，常用 3、17、65537）
5. 计算私钥指数 $d \equiv e^{-1} \pmod{\varphi(N)}$（即 $e \cdot d \equiv 1 \pmod{\varphi(N)}$）

**公钥**：$(N, e)$，**私钥**：$(d)$（或 $(p, q, d)$）

#### 加密与解密

$$\begin{aligned}
\text{加密：}&\quad c \equiv m^e \pmod N \\
\text{解密：}&\quad m \equiv c^d \pmod N
\end{aligned}$$

其中 $m$ 是明文整数（$0 \leq m < N$），$c$ 是密文。

### 1/6: Fermat Factorization

!!! bug "漏洞"
    $p$ 和 $q$ 很接近（差距 ≤ 10000）。

**原理**：$N = pq = \left(\frac{p+q}{2}\right)^2 - \left(\frac{p-q}{2}\right)^2 = a^2 - b^2$

从 $a = \lceil\sqrt{N}\rceil$ 开始，每次 $a \leftarrow a+1$，检查 $a^2 - N$ 是否为完全平方数。由于 $p$ 和 $q$ 的差值很小，循环次数在可接受的范围内。

```python
def fermat_factor(n):
    a = isqrt(n)
    if a * a < n:
        a += 1
    while True:
        b2 = a * a - n
        b = isqrt(b2)
        if b * b == b2:
            return a + b, a - b
        a += 1
```

### 2/6: Pollard p-1

!!! bug "漏洞"
    $p-1$ 的所有质因子都很小，≤ 1000，且每个质因子的幂 ≤ $2^{16}$。

**原理**：令 $M = \operatorname{lcm}(1, 2, \dots, B)$，计算 $a^M \bmod N$。由费马小定理，$a^M \equiv 1 \pmod p$，所以 $\gcd(a^M - 1, N) = p$。

**理解**：费马小定理告诉我们 $a^{p-1} \equiv 1 \pmod p$。如果 $p-1$ 只由小质数组成（比如 $p-1 = 2^3 \times 3 \times 5$），那我们找一个足够大的 $M$（囊括所有小质数的幂），$M$ 一定是 $p-1$ 的倍数。此时 $a^M \equiv 1 \pmod p$，即 $p \mid (a^M - 1)$。同时我们还知道 $p \mid N$，所以 $\gcd(a^M - 1, N)$ 能把 $p$ 找出来。

```python
def pollard_p1(n, bound=100000):
    a = 2
    M = 1
    for p in primes_up_to(bound):
        power = p
        while power * p <= bound:
            power *= p
        M *= power
    x = pow(a, M, n)
    p = gcd(x - 1, n)
    return p, n // p
```

### 3/6: Common Modulus Attack

!!! info "和 Lab 1 的一道题很像（共模攻击！）"

!!! bug "漏洞"
    相同明文 $m$ 用两个互质的指数 $e_1=3, e_2=17$ 在同一个 $N$ 下加密。

**原理**：扩展欧几里得求 $a \cdot e_1 + b \cdot e_2 = 1$，则：

$$m = m^{1} = m^{a \cdot e_1 + b \cdot e_2} = c_1^{a} \cdot c_2^{b} \pmod N$$

```python
_, a, b = extended_gcd(e1, e2)
if a < 0:
    m = pow(modinv(c1, n), -a, n) * pow(c2, b, n) % n
else:
    m = pow(c1, a, n) * pow(modinv(c2, n), -b, n) % n
```

### 4/6: Hastad Broadcast

!!! bug "漏洞"
    相同明文 $m$ 用 $e=3$ 加密，给出了 3 个不同的模数 $N_1, N_2, N_3$。

**原理**：中国剩余定理（CRT）求 $m^3 \bmod (N_1 N_2 N_3)$，然后开三次方根。

因为 $m < \min(N_i)$，所以 $m^3 < N_1 N_2 N_3$，CRT 的结果就是精确的 $m^3$。

**理解**：$e$ 太小了，$m^e$ 不够大，取模运算就失效了。

```python
M = crt([c1, c2, c3], [n1, n2, n3])
m = iroot(M, 3)  # 整数三次方根
```

### 5/6: Franklin-Reiter Attack

!!! bug "漏洞"
    $e=3$，同一个 $N$ 下加密了 $m$ 和 $m + \text{pad}$，且 pad 已知。

**原理**：两个多项式有公共根 $m$：

$$f_1(x) = x^3 - c_1,\quad f_2(x) = (x + \text{pad})^3 - c_2$$

计算 $\gcd(f_1, f_2)$ 得到 $(x - m)$。对 $e=3$ 可手算多项式消元：

$$\begin{aligned} g(x) &= f_2 - f_1 = 3p \cdot x^2 + 3p^2 \cdot x + (p^3 + c_1 - c_2) \\ &= A \cdot x^2 + B \cdot x + C \end{aligned}$$

再用 $f_1$ 和 $g$ 消去 $x^2$ 项，得到 $x$ 的一次方程，直接求解。

```python
A = (3 * pad) % n
B = (3 * pad * pad) % n
C = (pad**3 + c1 - c2) % n

x_coeff = (A * C - B * B) % n
constant = (A * A * c1 - B * C) % n
m = (-constant * modinv(x_coeff, n)) % n
```

### 6/6: Wiener's Attack

!!! bug "漏洞"
    私钥 $d$ 很小（约 200 bits），远小于 $N^{1/4}$。

**原理**：由 $ed \equiv 1 \pmod{\varphi}$ 得 $ed - k\varphi = 1$，即：

$$\left|\frac{e}{N} - \frac{k}{d}\right| < \frac{1}{2d^2}$$

$\frac{k}{d}$ 是 $\frac{e}{N}$ 的一个连分数收敛项，遍历即可找到 $d$。

**理解**：当 $d$ 很小时，由 $ed - k\varphi(N) = 1$ 可以推出 $\frac{e}{N} \approx \frac{k}{d}$（误差极小）。因此 $\frac{k}{d}$ 必然藏在 $\frac{e}{N}$ 的连分数收敛项中。

**连分数**：把一个数逐层拆成"整数 + 1/某数"的形式。例如 $\frac{43}{19} = 2 + \frac{1}{3 + \frac{1}{1 + \frac{1}{4}}}$，记作 $[2; 3, 1, 4]$。任意截断得到的值叫"收敛项"：$[2] = 2$，$[2;3] = \frac{7}{3}$，$[2;3,1] = \frac{9}{4}$，$[2;3,1,4] = \frac{43}{19}$。连分数的核心性质是：如果一个分数极其接近目标数，它**必定**作为某个收敛项出现。所以对 $\frac{e}{N}$ 做连分数展开，遍历所有收敛项，一定能找到 $\frac{k}{d}$，从而拿到私钥 $d$。

```python
def wiener(n, e, c):
    for k, d in convergents(continued_fraction(e, n)):
        if k == 0 or d % 2 == 0:
            continue
        if (e * d - 1) % k != 0:
            continue
        phi = (e * d - 1) // k
        s = n - phi + 1  # p + q
        disc = s * s - 4 * n
        if disc >= 0:
            sqrt_disc = isqrt(disc)
            if sqrt_disc * sqrt_disc == disc:
                p = (s + sqrt_disc) // 2
                q = (s - sqrt_disc) // 2
                if p * q == n:
                    return pow(c, d, n)
```

### 6 种 RSA 攻击速查

| 攻击 | 条件 | 关键方法 |
|------|------|----------|
| Fermat | $p, q$ 接近 | $N = a^2 - b^2$ |
| Pollard p-1 | $p-1$ 平滑 | $\gcd(a^{M} - 1, N)$ |
| Common Modulus | 同一 $N$，互质 $e_1, e_2$ | 扩展欧几里得 |
| Hastad | 小 $e$，多个 $N$ | CRT + 开方 |
| Franklin-Reiter | 相关明文，小 $e$ | 多项式 GCD |
| Wiener | 小 $d$ ($d < N^{1/4}$) | 连分数 |

---

## Task 2 KillerECC

!!! success "Flag: `ZJUCTF{eLl1PTiC_6_6_0_was_nOt_fIn3}`"

### 题目描述

Node.js 服务器使用 `elliptic@6.6.0` 在 secp256k1 曲线上做 ECDSA 签名。给出公钥，可无限签名任意消息，提交私钥即可获得 flag。

提示：`npm audit`，跑完命令会直接返回漏洞，本题是确定性 nonce 的实现出了问题。

### 漏洞分析

elliptic ≤ 6.6.0 的 GHSA-vjh7-7g9h-fjfh 漏洞：`_truncateToN` 函数允许**负数消息**。负数消息 `"-X"` 和正数消息 `"X"`（或 `"00X"` 等带前导零）**产生相同的 nonce $k$**，但**消息 hash 不同**（BN(-X) ≠ BN(X)）：

- `sign("-1")` → `msg = BN(-1)` → nonce 来自 `(-1).toArray()` → $r$
- `sign("1")` → `msg = BN(1)` → nonce 来自 `(1).toArray()` → **相同的 $r$**
- 但 hash 值：$-1 \neq 1 \pmod n$ → **不同的 $s$**

这就是 ECDSA nonce 重用！ECDSA 中一旦 nonce 重用，私钥直接泄漏：

$$\begin{aligned} s_1 &\equiv k^{-1}(h_1 + r \cdot d) \pmod n \\ s_2 &\equiv k^{-1}(h_2 + r \cdot d) \pmod n \\ \Rightarrow\quad k &\equiv (h_1 - h_2) \cdot (s_1 - s_2)^{-1} \pmod n \\ \Rightarrow\quad d &\equiv r^{-1}(s_1 \cdot k - h_1) \pmod n \end{aligned}$$

### 攻击步骤

1. `sign("-1")` → 得到 $(r, s_1)$，hash $h_1 = -1 \equiv n-1 \pmod n$
2. `sign("1")` → 得到 $(r, s_2)$，hash $h_2 = 1$
3. $r$ 相同、$s$ 不同 → nonce 重用，代入公式恢复 $d$
4. `submit <d_hex>` 获得 flag

### 关键代码

```python
N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141

r, s1 = sign("-1")   # h1 = -1 mod N = N-1
r, s2 = sign("1")    # h2 = 1

k = ((N-1 - 1) * pow((s1 - s2) % N, -1, N)) % N
d = (pow(r, -1, N) * (s1 * k - (N-1))) % N
```

---

## Task 3 EZcopper

!!! success "Flag: `ZJUCTF{y0u_HavE_l3@rnt_thE_coppER$miTH_m37hod_sO_c13VEr!!!!}`"

### 题目描述

已知 $N = p \times q$、$c_1 = m^p \bmod N$、$c_2 = m^q \bmod N$，求明文 $m$。

### 漏洞分析

**第一层（费马小定理）**：

$$c_1 = m^p \bmod N \;\Rightarrow\; c_1 \equiv m \pmod{p}$$
$$c_2 = m^q \bmod N \;\Rightarrow\; c_2 \equiv m \pmod{q}$$

**第二层（模 $p$ 下的指数消去）**：

$$c_1^N = (m^p)^{pq} = m^{p^2 q} = m^q \cdot (m^{p-1})^{pq} \equiv m^q \pmod{p}$$

而 $c_2 \equiv m^q \pmod{p}$。因此 $c_1^N - c_2 \equiv 0 \pmod{p}$。

**第三层（GCD 一步分解）**：

$$\boxed{\gcd(N,\; c_1^N - c_2) = p}$$

!!! example "小数字验证"
    取 $p=3,\; q=11,\; N=33,\; m=2$：
    
    $c_1 = 2^3 \bmod 33 = 8$，$c_2 = 2^{11} \bmod 33 = 2$
    
    $c_1^N \bmod N = 8^{33} \bmod 33 = 17$
    
    $\gcd(33, 17-2) = \gcd(33, 15) = 3 = p$ ✅
    
    $m = c_1 \bmod p = 8 \bmod 3 = 2$ ✅

### 关键代码

```python
import math
from Crypto.Util.number import long_to_bytes

p = math.gcd(N, pow(c1, N, N) - c2)  # 一步分解 N
m = c1 % p                             # 直接得到明文
flag = long_to_bytes(m)
```

---

## Task 4 EZDLP

!!! success "Flag: `ZJUCTF{poHl19_h3L1m@n_al6O!?}`"

### 题目描述

已知 $p$、$g=3$、$c = 3^x \bmod p$（$x$ 为 500-bit 素数），求离散对数 $x$。用 $x$ 的 MD5 作为 AES-ECB 密钥解密 flag。

!!! question "什么是 DLP？"
    普通对数：$g^x = y$，已知 $g, y$ 求 $x$。离散对数：$g^x \equiv y \pmod{p}$——多了模 $p$，难度天差地别。Diffie-Hellman、ElGamal、DSA 的安全性都基于它。**但**如果 $p-1$ 光滑（全小素数因子），Pohlig-Hellman 算法可以降维打击。

### 漏洞分析

**关键发现：$p-1 = 2^{518}$**

$p-1$ 极度光滑——**只有一个素数因子 2**，指数高达 518。

**Pohlig-Hellman 在 2-群上**：当 $p-1 = 2^{518}$，$x$ 二进制展开的每一位可以逐位判定：

$$y^{(p-1)/2^{i+1}} \bmod p = \begin{cases} 1 & \Rightarrow \text{bit}_i = 0 \\ p-1 & \Rightarrow \text{bit}_i = 1 \end{cases}$$

因为 $g=3$ 是生成元（$3^{(p-1)/2} \equiv -1 \pmod{p}$），$(-1)^{x_i}$ 直接暴露 $x_i$。

### 关键代码

```python
n = p - 1           # = 2^518
x = 0; y = c
for i in range(518):
    exp = n // (2 ** (i + 1))
    val = pow(y, exp, p)
    if val == p - 1:
        x |= (1 << i)
        y = (y * pow(g, -(1 << i), p)) % p

key = md5(str(x).encode()).digest()
flag = AES.new(key, AES.MODE_ECB).decrypt(ct).rstrip(b'\x00')
```

---

## Task 5 EZHNP

!!! abstract "Bonus 题 · 借助了 AI"

!!! success "Flag: `ZJUCTF{HNP_atT4cK_D$A}`"

### 题目描述

secp256k1 上 18 条相同消息的 ECDSA 签名。每条 nonce $k_i$ 是 240-bit 素数，而 $n \approx 2^{256}$——nonce 比阶少约 16 bits。利用偏差恢复私钥 $sk$。

### 漏洞分析

**第一步：改写为 HNP**

$$k_i \equiv a_i \cdot sk + b_i \pmod{n},\quad |k_i| < K = 2^{240}$$

其中 $a_i = r_i s_i^{-1} \bmod n,\; b_i = h s_i^{-1} \bmod n$。

**第二步：消去 $sk$**

取 $k_0$ 为参考：$k_j \equiv c_j \cdot k_0 + d_j \pmod{n}$，所有 $|k_j|, |k_0| < K$。

**第三步：Kannan 嵌入**

构造 19 维格，目标短向量 $[k_1, \dots, k_{17}, k_0, K]$，所有分量 $\le 2^{240}$。

**第四步：BKZ 约简**

LLL 默认 $\delta=0.75$ 不够，**BKZ-10** 找到目标 → 提取 $k_0$ → $sk = (k_0 - b_0) a_0^{-1} \bmod n$。

### 关键代码

```python
from fpylll import IntegerMatrix, LLL, BKZ

dim = t + 1  # 19
B = IntegerMatrix(dim, dim)
# ... 填充格基 ...
LLL.reduction(B)
BKZ.reduction(B, BKZ.Param(10))

for row in range(dim):
    if abs(B[row, t]) == K:
        k0 = B[row, t-1] % n
        sk = ((k0 - b_all[0]) * pow(a_all[0], -1, n)) % n
```

---

## Task 6 Regev

!!! success "Flag: `ZJUCTF{LLL_60_brrrr}`"

### 题目描述

经典 LWE（Regev 2005，后量子密码学基石）：

$$b = A \cdot s + e \pmod{q}$$

- $s \in \{0,1\}^{100}$（二进制），$e \in \{-1,0,1\}^{150}$（三元），$q \approx 10^6$
- 恢复 $s$，SHA256(s) 解密 AES-CBC

!!! question "前置：什么是格？"
    格是 $\mathbb{Z}^n$ 中一组基向量的所有整数线性组合——规则排列的无穷点阵。LLL/BKZ 在格中找最短非零向量。当目标向量**远短于**格中其他向量时，LLL 能把它揪出来。

### 漏洞分析

**Kannan 嵌入**：定义 251 维格 $\mathcal{L} = \{(x,y,z): Ax + y \equiv zb \pmod{q}\}$。

目标 $(s, e, 1)$ 的范数 $\approx 16$，而 Gauss 启发式预测随机向量 $\approx 12000$——**短了 750 倍**。

**关键：$\delta=0.99$**

| $\delta$ | 结果 |
|----------|------|
| 0.75（默认） | $\|\mathbf{b}_0\| \approx 3.5q$，未收敛 |
| **0.99** | $\|\mathbf{b}_0\| = 12$，直接命中目标 |

### 关键代码

```python
from fpylll import IntegerMatrix, LLL

dim = n + m + 1  # 251
B = IntegerMatrix(dim, dim)
# ... 填充 Kannan 嵌入格基 ...
LLL.reduction(B, delta=0.99)   # 关键！

for row in range(dim):
    if abs(B[row, dim-1]) == 1:
        s = [B[row, m+j] * B[row, dim-1] for j in range(n)]
```

---

## Bonus Feedback

这节课我是到教室听的（其实因为没什么事情，基本每节专题课都去了），能感觉到选 Crypto 的人确实比较多。课上讲了 RSA 相关的内容以及椭圆曲线加密等，让我对密码学有了一个整体的认知，这也是推动我选择这个方向的原因（提一嘴，Crypto 的专题三也非常有意思）。比较遗憾的是，由于数理基础比较薄弱，加上专业不太对口，课的后半程渐渐跟不上了，写作业的时候又翻来覆去地看 PPT。

作业方面我个人觉得还是比较友好的 —— 选另一个专题的时候被 Web 和 Reverse 的作业难度劝退了，其实我也真的很感兴趣来着，还去学了汇编语言 TwT。前面 RSA 的部分大部分可以靠自己完成，后面的 Bonus 难度确实很大，但借助 AI 之后至少能大概明白每道题涉及的知识点，不至于像其他专题那样两眼一抹黑。

建议的话，希望课上的知识点密度可以稍微降一点，其他都很好！专题三的课我非常喜欢，可以发扬光大！
