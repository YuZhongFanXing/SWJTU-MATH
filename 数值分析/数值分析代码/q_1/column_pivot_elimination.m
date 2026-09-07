function x = column_pivot_elimination(A, b)
% 列主元消元法求解线性方程组 Ax = b
% 输入: A - 系数矩阵, b - 右端向量
% 输出: x - 解向量

[n, ~] = size(A);
x = zeros(n, 1);
Ab = [A, b];  % 增广矩阵

% 列主元消元过程
for k = 1:n-1
    % 寻找列主元
    [~, max_row] = max(abs(Ab(k:n, k)));
    max_row = max_row + k - 1;
    
    % 交换行
    if max_row ~= k
        temp = Ab(k, :);
        Ab(k, :) = Ab(max_row, :);
        Ab(max_row, :) = temp;
    end
    
    % 消元
    for i = k+1:n
        factor = Ab(i, k) / Ab(k, k);
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