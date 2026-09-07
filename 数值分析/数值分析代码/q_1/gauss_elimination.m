function x = gauss_elimination(A, b)
% 高斯消元法求解线性方程组 Ax = b
% 输入: A - 系数矩阵, b - 右端向量
% 输出: x - 解向量

[n, ~] = size(A);%接受矩阵的行数
x = zeros(n, 1);
Ab = [A, b];  % 增广矩阵

% 前向消元过程
for k = 1:n-1
    for i = k+1:n
        factor = Ab(i, k) / Ab(k, k);%每一行需要乘的因子
        Ab(i, k:n+1) = Ab(i, k:n+1) - factor * Ab(k, k:n+1);
    end
end

% 回代过程
x(n) = Ab(n, n+1) / Ab(n, n);
for i = n-1:-1:1
    sum_val = Ab(i, n+1);
    for j = i+1:n
        sum_val = sum_val - Ab(i, j) * x(j);
    end
    x(i) = sum_val / Ab(i, i);
end
end