# Crypto Lab 2

## Task 1 RSA Party

> Flag: `ZJUCTF{?!Rs@_MA$TEr!?}`

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

**漏洞**：$p$ 和 $q$ 很接近（差距 ≤ 10000）。

**原理**：$N = pq = \left(\frac{p+q}{2}\right)^2 - \left(\frac{p-q}{2}\right)^2 = a^2 - b^2$

从 $a = \lceil\sqrt{N}\rceil$ 开始，每次 $a \leftarrow a+1$，检查 $a^2 - N$ 是否为完全平方数。由于 $p$ 和 $q$ 的差值很小，循环次数在可接受的范围内，这样我们就完成了攻击。

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

**漏洞**：$p-1$ 的所有质因子都很小，≤ 1000，且每个质因子的幂 ≤ $2^{16}$。

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

> 和 Lab 1 的一道题很像（？！共模攻击！？）

**漏洞**：相同明文 $m$ 用两个互质的指数 $e_1=3, e_2=17$ 在同一个 $N$ 下加密。

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

**漏洞**：相同明文 $m$ 用 $e=3$ 加密，给出了 3 个不同的模数 $N_1, N_2, N_3$。

**原理**：中国剩余定理（CRT）求 $m^3 \bmod (N_1 N_2 N_3)$，然后开三次方根。

因为 $m < \min(N_i)$，所以 $m^3 < N_1 N_2 N_3$，CRT 的结果就是精确的 $m^3$。

**理解**：$e$ 太小了， $m^e$ 不够大，取模运算就失效了

```python
M = crt([c1, c2, c3], [n1, n2, n3])
m = iroot(M, 3)  # 整数三次方根
```

### 5/6: Franklin-Reiter Attack

**漏洞**：$e=3$，同一个 $N$ 下加密了 $m$ 和 $m + \text{pad}$，且 pad 已知。

**原理**：这两个多项式一定存在公共根 $m$：

$$f_1(x) = x^3 - c_1,\quad f_2(x) = (x + \text{pad})^3 - c_2$$

计算 $\gcd(f_1, f_2)$ 得到 $(x - m)$。对 $e=3$ 我们可以计算多项式消元：

$$\begin{aligned} g(x) &= f_2 - f_1 = 3p \cdot x^2 + 3p^2 \cdot x + (p^3 + c_1 - c_2) \\ &= A \cdot x^2 + B \cdot x + C \end{aligned}$$

再用 $f_1$ 和 $g$ 消去 $x^2$ 项，得到 $x$ 的一次方程，直接求解即可。


```python
A = (3 * pad) % n
B = (3 * pad * pad) % n
C = (pad**3 + c1 - c2) % n

x_coeff = (A * C - B * B) % n
constant = (A * A * c1 - B * C) % n
m = (-constant * modinv(x_coeff, n)) % n
```

### 6/6: Wiener's Attack

**漏洞**：私钥 $d$ 很小（约 200 bits），远小于 $N^{1/4}$。

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

### 6 种 RSA 攻击

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

> Flag: `ZJUCTF{eLl1PTiC_6_6_0_was_nOt_fIn3}`

### 题目描述

Node.js 服务器使用 `elliptic@6.6.0` 在 secp256k1 曲线上做 ECDSA 签名。给出公钥，可无限签名任意消息，提交私钥得就可以获得 flag。

提示：`npm audit`，跑完命令会直接返回漏洞，本题是确定性 nonce 的实现出了问题。

### 漏洞分析

elliptic ≤ 6.6.0 的 GHSA-vjh7-7g9h-fjfh 漏洞：`_truncateToN` 函数允许**负数消息**，这会产生如下漏洞：负数消息 `"-X"` 和正数消息 `"X"`（或 `"00X"` 等带前导零）**产生相同的 nonce $k$**，但**消息 hash 不同**（BN(-X) ≠ BN(X)）：

- `sign("-1")` → `msg = BN(-1)` → nonce 来自 `(-1).toArray()` → $r$
- `sign("1")` → `msg = BN(1)` → nonce 来自 `(1).toArray()` → **相同的 $r$**
- 但 hash 值：$-1 \neq 1 \pmod n$ → **不同的 $s$**

这就是 ECDSA nonce 重用！ECDSA 中一旦 nonce 重用，我们就可以直接获取私钥：

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

## Task 3 EZcopper

> Flag: `ZJUCTF{y0u_HavE_l3@rnt_thE_coppER$miTH_m37hod_sO_c13VEr!!!!}`

### 题目描述

已知 $N = p \times q$、$c_1 = m^p \bmod N$、$c_2 = m^q \bmod N$，求明文 $m$。

### 漏洞分析

**第一层（费马小定理）**：

费马小定理 $a^p \equiv a \pmod{p}$ 对所有整数 $a$ 成立，所以我们可以得到以下两个式子：

$$c_1 = m^p \bmod N \;\Rightarrow\; c_1 \equiv m^p \equiv m \pmod{p}$$
$$c_2 = m^q \bmod N \;\Rightarrow\; c_2 \equiv m^q \equiv m \pmod{q}$$

**第二层（模 $p$ 下的指数消去）**：

模 $p$ 下计算 $c_1^N$，利用 $N = pq$：

$$c_1^N = (m^p)^{pq} = m^{p^2 q}$$

从指数中分离出 $p-1$（费马小定理的关键指数）：

$$m^{p^2 q} = m^q \cdot m^{p(p-1)q} = m^q \cdot (m^{p-1})^{pq} \equiv m^q \cdot 1^{pq} = m^q \pmod{p}$$

所以 $c_1^N \equiv m^q \pmod{p}$。而 $c_2 = m^q \bmod N$，自然也有 $c_2 \equiv m^q \pmod{p}$。两式相减：

$$c_1^N - c_2 \equiv 0 \pmod{p} \quad\Rightarrow\quad p \mid (c_1^N - c_2)$$

**第三层（GCD 一步分解）**：

又因为 $p \mid N$，所以：

$$\boxed{\gcd(N,\; c_1^N - c_2) = p}$$

以压倒性概率 $q \nmid (c_1^N - c_2)$，因此 GCD 直接给出 $p$。

**例子**：我们可以取简单一点的数字 $p=3,\; q=11,\; N=33,\; m=2$：

$$\begin{aligned}
c_1 &= m^p \bmod N = 2^3 \bmod 33 = 8 \\
c_2 &= m^q \bmod N = 2^{11} \bmod 33 = 2
\end{aligned}$$

验证：$c_1 \bmod p = 8 \bmod 3 = 2 = m$ ✅，$c_2 \bmod q = 2 \bmod 11 = 2 = m$ ✅。

通过已知的 $N, c_1, c_2$ 进行运算：

$$c_1^N \bmod N = 8^{33} \bmod 33 = 17$$

$$c_1^N \bmod N - c_2 = 17 - 2 = 15$$

$$\gcd(N,\; 15) = \gcd(33,\; 15) = 3 = p \quad ✅$$

$$m = c_1 \bmod p = 8 \bmod 3 = 2 \quad ✅$$

只需两行运算，我们就成功分解了 $N$ ，说明这个方法是有效的。

### 攻击步骤

1. 计算 $p = \gcd(N,\; c_1^N - c_2)$，一步分解 $N$
2. 由 $m = c_1 \bmod p$（或 $m = c_2 \bmod q$）直接恢复明文
3. 由于 $m$ 是 480-bit，$p$ 是 512-bit，$m < p$ 自然成立，$\bmod p$ 后的结果就是 $m$ 本身

### 关键代码

```python
import math
from Crypto.Util.number import long_to_bytes

p = math.gcd(N, pow(c1, N, N) - c2)  # 一步分解 N
m = c1 % p                             # 直接得到明文
flag = long_to_bytes(m)
```

## Task 4 EZDLP

> Flag: `ZJUCTF{poHl19_h3L1m@n_al6O!?}`

### 题目描述

已知一个大素数 $p$、底数 $g=3$、以及 $c = 3^x \bmod p$（$x$ 是 500-bit 素数），求离散对数 $x$。然后用 $x$ 的 MD5 值作为 AES-ECB 密钥解密密文 $ct$ 得到 flag。

**什么是 DLP（离散对数问题）？**

普通对数：$g^x = y$，已知 $g, y$ 求 $x$。离散对数：$g^x \equiv y \pmod{p}$，已知 $g, y, p$ 求 $x$——多了个模 $p$，但难度天差地别。对于大素数 $p$，这是公认的数学难题，Diffie-Hellman 密钥交换、ElGamal、DSA 的安全性都基于它。**但**，如果 $p-1$ 光滑（全是小素数因子），DLP 会被 Pohlig-Hellman 算法降维打击（。

### 漏洞分析

**关键发现：$p-1 = 2^{518}$**

$$p = 960494008017250155494739990397196249930200062145145133132556398221074529657304218221253517153928380265486339083177542201148993799925721673833333778621388110957986908045712612233794551809$$

$p-1$ 极度光滑（至于光滑是什么可以去看Task 1 qwq）——**只有一个素数因子 2**，指数高达 518。一般 DLP 在 $p-1$ 光滑时会变得可解，我们可以用到 Pohlig-Hellman 算法来解决这个问题。

**Pohlig-Hellman 算法**

DLP 的困难性依赖于 $p-1$ 有大素数因子。当 $p-1 = \prod q_i^{e_i}$ 且所有 $q_i$ 都很小，就可以把原 DLP 分解到每个 $q_i^{e_i}$ 子群中分别求解，再用 CRT 合并。本题中只有一个 $q=2$，所以整个 DLP 退化为逐比特判断。

**2-群上的逐比特恢复**

当 $q=2$ 时，$x$ 的 $2$ 进制展开就是二进制。由于 $g=3$ 是模 $p$ 的生成元（$3^{(p-1)/2} \equiv -1 \pmod{p}$），第 $i$ 轮可以判断 $x$ 的第 $i$ 个比特是 0 还是 1：

$$y = c \cdot g^{-x_{\text{已知低位}}} \bmod p$$
$$y^{(p-1)/2^{i+1}} \bmod p = \begin{cases} 1 & \Rightarrow \text{bit}_i = 0 \\ p-1 & \Rightarrow \text{bit}_i = 1 \end{cases}$$

**理解**：想象 $x$ 是一个 518 位的二进制数。每一轮剥掉已知的低位，让剩下的最低位暴露出来。判断它是不是 1 的方法就是看 $y$ 的 $(p-1)/2^{i+1}$ 次幂——如果是 $-1$（即 $p-1$），说明这一位是 1；如果是 $1$，说明这一位是 0。518 轮之后，$x$ 的所有比特就全部恢复了。

### 攻击步骤

1. 初始化 $x_{\text{low}} = 0$
2. 对 $i = 0$ 到 $517$：
   - 计算 $y = c \cdot g^{-x_{\text{low}}} \bmod p$（消除已知低位的影响）
   - 计算 $y^{(p-1)/2^{i+1}} \bmod p$，若为 $p-1$ 则第 $i$ 位是 1，否则是 0
   - 更新 $x_{\text{low}} = x_{\text{low}} + \text{bit} \cdot 2^i$
3. 518 轮后得到完整 $x$，取其 MD5 作为 AES 密钥解密 $ct$

### 关键代码

```python
n = p - 1           # = 2^518
k = 518
x = 0; y = c
for i in range(k):
    exp = n // (2 ** (i + 1))
    val = pow(y, exp, p)
    if val == p - 1:
        bit = 1
        x |= (1 << i)
        y = (y * pow(g, -(1 << i), p)) % p

key = md5(str(x).encode()).digest()
flag = AES.new(key, AES.MODE_ECB).decrypt(ct).rstrip(b'\x00')
```

## Task 5 EZHNP

> Bonus 的两道题很大程度的上用了AI（包括代码及原理解释……）已经尽量把自己的理解写进报告了

> Flag: `ZJUCTF{HNP_atT4cK_D$A}`

### 题目描述

ECDSA 签名（secp256k1 曲线），服务器给出了 18 条**相同消息**的签名 $(r_i, s_i)$。每条签名的 nonce $k_i$ 是一个 240-bit 素数，而曲线阶 $n \approx 2^{256}$——也就是说 nonce 比阶少约 16 bits。需要利用 nonce 的偏差恢复私钥 $sk$，从而解密 flag。

**前置：ECDSA 签名回顾**

$$s = k^{-1}(h + r \cdot sk) \bmod n$$

其中 $k$ 是临时密钥（nonce），$h$ 是消息哈希，$sk$ 是私钥。如果 $k$ 足够随机且完全未知，签名是安全的。但本题 $k$ 只有 240 bits，这就有攻击的机会。

### 漏洞分析

**第一步：改写为 HNP（Hidden Number Problem）**

将签名方程变形，把 $k_i$ 表示为 $sk$ 的线性函数：

$$k_i \equiv a_i \cdot sk + b_i \pmod{n},\quad |k_i| < K = 2^{240}$$

其中 $a_i = r_i \cdot s_i^{-1} \bmod n,\; b_i = h \cdot s_i^{-1} \bmod n$。

这就是 Hidden Number Problem：已知 $a_i, b_i, n$，求 $sk$，而 $k_i$ 是"隐藏的小数"。

**第二步：消去 $sk$，化为多个 $k_i$ 间的关系**

取 $k_0$ 作为参考，消去未知的 $sk$：

$$k_j \equiv c_j \cdot k_0 + d_j \pmod{n},\quad |k_0| < K,\; |k_j| < K$$

其中 $c_j = a_j \cdot a_0^{-1} \bmod n,\; d_j = b_j - c_j \cdot b_0 \bmod n$。

现在问题变成：找一组 $k_0, k_1, \dots, k_{t-1}$（$t=17$），每个都 $< 2^{240}$，且满足模方程。

**第三步：Kannan 嵌入 → 格基约简**

将问题嵌入到一个 $d = t+1 = 18$ 维的格中：

$$B = \begin{bmatrix} n & 0 & \cdots & 0 & 0 & 0 \\ 0 & n & \cdots & 0 & 0 & 0 \\ \vdots & & \ddots & & \vdots & \vdots \\ 0 & 0 & \cdots & n & 0 & 0 \\ c_1 & c_2 & \cdots & c_{t-1} & 1 & 0 \\ d_1 & d_2 & \cdots & d_{t-1} & 0 & K \end{bmatrix}$$

目标短向量 $[k_1, k_2, \ldots, k_{t-1}, k_0, K]$，每个分量 $\le 2^{240}$。这个向量确实在格中（通过列线性组合可验证），且远短于格中"平均"长度的向量。

**第四步：BKZ 格基约简**

19 维格中，LLL（默认 $\delta=0.75$）质量不够，需要 BKZ：
- **BKZ-10** 即可找到目标短向量
- 在约简后的基中搜索最后一列等于 $\pm K$ 的行，提取 $k_0$
- 验证：$sk = (k_0 - b_0) \cdot a_0^{-1} \bmod n$

**直观理解**：格基约简就是"找格中最短的向量"。目标向量因为所有分量都被约束在 $2^{240}$ 以内，比格中随机向量短得多——就像一堆长棍子里唯一的一根短棍子，BKZ 算法能把它挑出来。

### 攻击步骤

1. 从 18 条签名计算 $a_i, b_i$
2. 消去 $sk$，得到 $c_j, d_j$（$j = 1..17$）
3. 构造 19×19 的 Kannan 嵌入格基
4. 用 fpylll 的 BKZ-10 约简格基
5. 找到最后一列为 $\pm K$ 的行，提取 $k_0$
6. 计算 $sk = (k_0 - b_0) \cdot a_0^{-1} \bmod n$，即得私钥

### 关键代码

```python
from fpylll import IntegerMatrix, LLL, BKZ

# 计算 a_i, b_i, 消去 sk 得到 c_j, d_j
dim = t + 1  # 18
B = IntegerMatrix(dim, dim)
for i in range(t-1): B[i, i] = n
for i in range(t-1): B[t-1, i] = c_list[i]
B[t-1, t-1] = 1; B[t-1, t] = 0
for i in range(t-1): B[t, i] = d_list[i]
B[t, t-1] = 0; B[t, t] = K

LLL.reduction(B)
BKZ.reduction(B, BKZ.Param(10))

# 找 last=±K 的行, 提取 k_0, 计算 sk
for row in range(dim):
    if abs(B[row, t]) == K:
        k0 = B[row, t-1] % n
        sk = ((k0 - b_all[0]) * pow(a_all[0], -1, n)) % n
```

## Task 6 Regev

> Flag: `ZJUCTF{LLL_60_brrrr}`

### 题目描述

这是 LWE（Learning With Errors）问题——Regev 2005 年提出，是后量子密码学的基石。已知矩阵 $A$（150×100）、向量 $b$（150维）、模数 $q \approx 10^6$，满足：

$$b = A \cdot s + e \pmod{q}$$

目标是恢复秘密向量 $s \in \{0,1\}^{100}$，并用它的 SHA256 作为 AES-CBC 密钥解密 flag。误差向量 $e \in \{-1, 0, 1\}^{150}$ 极小。

**前置：什么是格？**

格是 $\mathbb{Z}^n$ 中一组线性无关向量的所有整数线性组合——简单说就是一个规则排列的无穷点阵。格基约简（LLL、BKZ）就是在格中找"最短的非零向量"。虽然一般意义上的 SVP 很难，但当目标向量**远短于**格中其他所有向量时，LLL 能把它揪出来。

### 漏洞分析

**第一步：将 LWE 转化为格问题（Kannan 嵌入）**

定义 $d = n + m + 1 = 251$ 维格：

$$\mathcal{L} = \{(x, y, z) \in \mathbb{Z}^n \times \mathbb{Z}^m \times \mathbb{Z} : A\cdot x + y \equiv z\cdot b \pmod{q}\}$$

目标向量 $(s, e, 1)$ 就落在这个格中（验证：$A\cdot s + e \equiv b \pmod{q}$），且其范数极小：

$$\|(s, e, 1)\| = \sqrt{\underbrace{100}_{\text{二进制 }s_j} + \underbrace{150}_{\text{三元 }e_i} + 1} \approx 16$$

**第二步：构造格基矩阵**

$$B = \begin{bmatrix} q\cdot I_m & \mathbf{0} & \mathbf{0} \\ -\mathbf{A}^T \bmod q & I_n & \mathbf{0} \\ \mathbf{b} & \mathbf{0} & 1 \end{bmatrix}$$

格的行列式 $\det(\mathcal{L}) = q^m \approx 2^{3000}$。Gauss 启发式预测格中"典型"最短向量长度约为 12000，而目标向量只有 16——比平均短了约 **750 倍**，是极其显著的唯一最短向量（uSVP）。

**第三步：LLL 的 $\delta$ 参数是关键**

- 默认 $\delta = 0.75$：在 251 维格上 LLL 收敛不到目标，输出最短向量仍在 $3.5q \approx 3.5 \times 10^6$ 级别，远大于目标
- **$\delta = 0.99$**：Lovász 条件极紧，LLL 直接找到 $|\mathbf{b}_0| = 12$ 即目标向量

$\delta$ 越接近 1，LLL 每次交换向量的判断越严格，约简质量越高。高维 uSVP 上大 $\delta$ 是唯一出路。

**理解**：目标向量 $(s, e, 1)$ 的每个分量都被约束得极小——$s_j$ 只取 0 或 1，$e_i$ 只取 -1/0/1。而格中随机向量的分量普遍在 $q$ 量级。

### 攻击步骤

1. 用 $A, b, q$ 构造 251×251 的 Kannan 嵌入格基
2. 调用 `LLL.reduction(B, delta=0.99)` 进行格基约简
3. 在约简后的基中搜索最后一列为 $\pm 1$ 的行
4. 该行的第 $[m, m+n-1]$ 列乘以符号即恢复 $s$
5. 用 SHA256(s) 解密 AES-CBC 得 flag

### 关键代码

```python
from fpylll import IntegerMatrix, LLL

dim = n + m + 1  # 251
B = IntegerMatrix(dim, dim)

for i in range(m):
    B[i, i] = q                    # q*I_m
for j in range(n):
    for i in range(m):
        B[m+j, i] = (-A[i][j]) % q # -A^T mod q
    B[m+j, m+j] = 1                # I_n
for i in range(m):
    B[dim-1, i] = b[i]             # b
B[dim-1, dim-1] = 1                # 1

# 关键：delta=0.99！
LLL.reduction(B, delta=0.99)

for row in range(dim):
    if abs(B[row, dim-1]) == 1:
        sign = B[row, dim-1]
        s = [B[row, m+j] * sign for j in range(n)]
```

## Bonus Feedback

这节课我是到教室听的（其实因为没什么事情，基本每节专题课都去了），能感觉到选 Crypto 的人确实比较多。课上讲了 RSA 相关的内容以及椭圆曲线加密等，让我对密码学有了一个整体的认知，这也是推动我选择这个方向的原因（提一嘴，Crypto 的专题三也非常有意思）。比较遗憾的是，由于数理基础比较薄弱，加上专业不太对口，课的后半程渐渐跟不上了，写作业的时候又翻来覆去地看 PPT。

作业方面我个人觉得还是比较友好的 —— 选另一个专题的时候被 Web 和 Reverse 的作业难度劝退了，其实我也真的很感兴趣来着，还去学了汇编语言 TwT。前面 RSA 的部分大部分可以靠自己完成，后面的 Bonus 难度确实很大，但借助 AI 之后至少能大概明白每道题涉及的知识点，不至于像其他专题那样两眼一抹黑。

建议的话，希望课上的知识点密度可以稍微降一点，其他都很好！专题三的课我非常喜欢，可以发扬光大！
