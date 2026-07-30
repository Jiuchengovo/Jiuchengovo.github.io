# Crypto Lab 3

## Task 1 SEKAI Oneline Crypto(PPT Q2)

> ?! 67 !?

### 1.1 前置：运算符优先级

Python 运算符优先级：`**` > 一元 `~` > 二元 `+`

```
~(6+~7)**67
= ~((6 + (~7)) ** 67)      # ** 优先级最高
= ~((6 + (-8)) ** 67)       # ~7 = -8 (位取反)
= ~((-2) ** 67)             # 6 + (-8) = -2
= ~(-(2**67))               # (-2)^67 = -2^67 (67 是奇数)
= 2**67 - 1                 # ~x = -x-1
= 147573952589676412927
```

模数 $M = 2^{67} - 1$，是一个 **Mersenne 数**。

### 1.2 数学关系

由 $M = 2^{67} - 1$ 知 $2^{67} \equiv 1 \pmod{M}$。因此：

$$256^i = (2^8)^i = 2^{8i} \equiv 2^{8i \bmod 67} \pmod{M}$$

由于 $\gcd(8, 67) = 1$，当 $i$ 遍历 $0, 1, \ldots, 66$ 时，$8i \bmod 67$ **恰好遍历 $0, 1, \ldots, 66$ 每个值一次**。

$$\{256^i \bmod M\}_{i=0}^{66} = \{2^0, 2^1, \ldots, 2^{66}\}$$

**67 个字节位置与 67 个二进制位之间存在双射 (bijection)**，即把目标值写成二进制时，每一位决定对应位置的字符是 `'6'` 还是 `'7'`

### 1.3 构造过程

Flag 结构（74 字节，big-endian 权重从高到低）：

```
S      E      K      A      I      {      [67个 '6'/'7']     }
256^73 256^72 256^71 256^70 256^69 256^68  256^67 ... 256^1  256^0
```

设前缀 `b'SEKAI{'` 对应的整数值为 $P$，67 个变量字符的整数值为 $V$：

$$N = P \cdot 256^{68} + V \cdot 256 + 125$$

（`}` 的 ASCII 码为 125）

要求 $N \equiv 0 \pmod{M}$：

$$V \equiv \underbrace{(-P \cdot 256^{68} - 125) \cdot 256^{-1} \bmod M}_{T} \pmod{M}$$

对 $V$ 分解，位置 $i$（0 = 变量部分 MSB，66 = 变量部分 LSB）的字符为 `'6'`（ASCII 54）或 `'7'`（ASCII 55）：

$$V = \sum_{i=0}^{66} (54 + b_i) \cdot 256^{66-i}, \quad b_i \in \{0, 1\}$$

**关键化简**：所有 `'6'` 的贡献 $\sum_{i=0}^{66} 54 \cdot 256^{66-i} \equiv 54 \cdot \sum_{j=0}^{66} 2^j = 54M \equiv 0 \pmod{M}$，自动抵消！

$$\sum_{i=0}^{66} b_i \cdot 2^{q_i} \equiv T \pmod{M}, \quad q_i = 8(66-i) \bmod 67$$

将 $T$ 写成 67 位二进制 $T = \sum_{j=0}^{66} t_j \cdot 2^j$：

$$b_i = t_{q_i} \quad \text{即：位置 } i \text{ 是 '7' } \iff T \text{ 的第 } 8(66-i)\bmod 67 \text{ 位 } = 1$$

### 1.4 解题代码

```python
import re

M = 2**67 - 1

prefix = "SEKAI{"
prefix_val = int.from_bytes(prefix.encode(), 'big')
inv256 = pow(256, -1, M)

# 计算目标值 T
target = (-prefix_val * pow(256, 68, M) - ord('}')) * inv256 % M

# 构建 67 个变量字符：二进制位 → 字符映射
chars = []
for i in range(67):
    q = (8 * (66 - i)) % 67        # 该位置对应 T 的第 q 个二进制位
    bit = (target >> q) & 1
    chars.append('7' if bit else '6')

flag = prefix + ''.join(chars) + '}'

# 验证
assert re.match(r'SEKAI{[67]{67}}$', flag)
assert int.from_bytes(flag.encode(), 'big') % M == 0
print(f"Flag: {flag}")
```

### 1.5 运行结果

```
Target T = 75516266994668058244
T (67-bit binary) = 1000001011111111111101011001011101010110100101111101011011010000100

Flag: SEKAI{6777676667666666677676776776777766777777777776777767777776677666666}
Length: 74
Regex: ✓   Modulo: ✓
```

---

## Task 2 My Question

### 2.1 题目：Self-Referential Modulus

```python
import re
assert re.fullmatch(r'CTF\{[A-Z]{20}\}', flag := input())
n = int.from_bytes(flag.encode(), 'big')
assert n % int.from_bytes(b'CTF{', 'big') == 0
```

**设计思路**

这道题的最主要的灵感来自 Task 1 同样是两行 Python 完成所有校验，同样是把 flag 当大整数做模运算。区别在于 Task 1 的模数 $2^{67}-1$ 是梅森素数，比较大众，而本题的模数取自 flag 本身的前缀 `CTF{`，形成一种"自己整除自己"的结构。最后在AI的协助下出完了这道题！

个人认为有以下几个亮点：

- **简洁**：代码只有两行，没有硬编码的模数，没有随机数，一切条件都源自 flag 自身。乍一看像是不可解的循环依赖（flag 的值决定了模数，模数又反过来约束 flag），但实际上前缀和变量部分是分离的，前缀一旦确定模数就固定了。
- **自指**：`b'CTF{'` 作为前缀和模数的双重身份，让题目天然携带 flag 格式约束。换一个前缀（比如 `FLAG{`）就能生成一道全新的题，复用性很强。
- **难度较低**：模数 $P = \mathtt{int.from\_bytes(b'CTF\{', 'big')} \approx 2^{30}$ 只有约 30 bits，而 20 个大写字母的搜索空间约 $2^{94}$，暴力枚举完全可行

### 2.2 解题分析

**步骤 1：建立方程**

Flag = `"CTF{"` (4 字节) + 20 个大写字母 + `"}"` (1 字节) = 25 字节

$$n = P \cdot 256^{21} + V \cdot 256 + 125$$

其中 $P = \text{int.from\_bytes(b'CTF\{', 'big')} = 1129596539 \ (\approx 2^{30})$，$V$ 是 20 个大写字母构成的整数值。

**步骤 2：化简模条件**

$$n \equiv 0 \pmod{P} \implies P \cdot 256^{21} + V \cdot 256 + 125 \equiv 0 \pmod{P}$$

由于 $P \cdot 256^{21} \equiv 0 \pmod{P}$，消去后：

$$V \cdot 256 + 125 \equiv 0 \pmod{P} \implies V \equiv -125 \cdot 256^{-1} \pmod{P}$$

计算得 $V \equiv 454486107 \pmod{P}$。

**步骤 3：构造合法字符**

$P \approx 2^{30}$，而 20 个大写字母提供 $26^{20} \approx 2^{94}$ 种组合（远超 $P$），解一定存在。

**构造技巧**：固定前 16 个字母（随机），用后 4 个字母吸收模约束。4 字节可表示 $[0, 256^4) \approx 2^{32}$ 远大于 $P \approx 2^{30}$，每个固定前缀对应约 4 个候选后缀；每个候选需 4 字节均为大写字母（概率 $\approx (26/256)^4 \approx 10^{-4}$），预期约 2500 次随机尝试即可找到解。

### 2.3 解题代码

```python
import re
import random

prefix = "CTF{"
P = int.from_bytes(prefix.encode(), 'big')       # 1129596539
inv256 = pow(256, -1, P)
target = (-ord('}')) * inv256 % P                 # 454486107

random.seed(42)
for attempt in range(50000):
    # 随机 16 个大写字母作为"粗调"
    fixed = ''.join(chr(random.randint(65, 90)) for _ in range(16))
    fixed_val = int.from_bytes(fixed.encode(), 'big')

    # 后 4 字节需满足: fixed_val * 256^4 + free_val ≡ target (mod P)
    need = (target - fixed_val * pow(256, 4, P)) % P

    # 枚举所有满足模条件的 4 字节值
    for free_val in range(need, 256**4, P):
        bs = [(free_val >> 24) & 0xFF, (free_val >> 16) & 0xFF,
              (free_val >> 8) & 0xFF,  free_val & 0xFF]

        if all(65 <= b <= 90 for b in bs):        # 全是 A-Z
            free_str = ''.join(chr(b) for b in bs)
            flag = prefix + fixed + free_str + '}'

            m = re.fullmatch(r'CTF\{[A-Z]{20}\}', flag)
            n = int.from_bytes(flag.encode(), 'big')
            if m and n % P == 0:
                print(f"Flag: {flag}")
                print(f"n % P = {n % P}")
                print("✓ Solved!")
                exit(0)

    if attempt % 5000 == 0:
        print(f"  trying... attempt {attempt}")
```

### 2.4 运行结果

```
Modulus P = 1129596539 (~31 bits)
Target V mod P = 454486107

Flag: CTF{YHXDLHRWQQFIKXEOVGCX}
n % P = 0
✓ Solved!
```

**手动验证**：

```python
>>> import re
>>> flag = "CTF{YHXDLHRWQQFIKXEOVGCX}"
>>> re.fullmatch(r'CTF\{[A-Z]{20}\}', flag)
<re.Match object; span=(0, 25), match='CTF{YHXDLHRWQQFIKXEOVGCX}'>
>>> n = int.from_bytes(flag.encode(), 'big')
>>> n % int.from_bytes(b'CTF{', 'big')
0
```