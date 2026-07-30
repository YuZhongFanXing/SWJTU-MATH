% 参数设置
n_values = [10, 20, 40];
tol = 1e-8;
omegas = [1,1.25, 1.5, 1.75];  % 包含ω=1

% 初始化结果存储
jacobi_iters = zeros(3, 1);
sor_iters = zeros(3, 4);  % 3行（n值）×4列（4个ω值），原代码这里写的3列是笔误，不影响但显式标注更清晰

% 迭代计算
for idx = 1:3
    n = n_values(idx);
    A = create_pentadiagonal(n);  % 需确保该函数已定义
    x0 = ones(n, 1);
    
    % Jacobi迭代
    [~, iter_jac] = jacobi(A, x0, tol);  % 需确保jacobi函数已定义
    jacobi_iters(idx) = iter_jac;
    
    % SOR迭代（4个ω值）
    for k = 1:4
        [~, iter_sor] = sor(A, x0, omegas(k), tol);  % 需确保sor函数已定义
        sor_iters(idx, k) = iter_sor;
    end
end

% 打印结果表格（核心修改：补全ω=1，修正列标题和数据对应）
fprintf('\n===== 迭代次数结果 =====\n');
fprintf('矩阵维度 n | Jacobi | SOR(ω=1) | SOR(ω=1.25) | SOR(ω=1.5) | SOR(ω=1.75)\n');
fprintf('---------------------------------------------------------------------------\n');
for i = 1:3
    fprintf('     %3d    | %5d | %8d | %11d | %10d | %10d\n', ...
        n_values(i), jacobi_iters(i), ...
        sor_iters(i,1), sor_iters(i,2), sor_iters(i,3), sor_iters(i,4));
end
fprintf('\n');

% 合并数据用于绘图（Jacobi + 4个SOR，共5列）
bar_data = [jacobi_iters, sor_iters];

% 绘制柱状图
figure;
bar(bar_data);
set(gca, 'FontSize', 12, 'Box', 'on', 'LineWidth', 1.5, ...
    'XTickLabel', n_values);
xlabel('矩阵维度 n', 'FontSize', 14, 'FontWeight', 'bold');
ylabel('迭代次数', 'FontSize', 14, 'FontWeight', 'bold');
title('Jacobi与SOR方法迭代次数对比', 'FontSize', 16, 'FontWeight', 'bold');
legend({'Jacobi', 'SOR (ω=1)', 'SOR (ω=1.25)', 'SOR (ω=1.5)', 'SOR (ω=1.75)'}, ...
       'Location', 'northeast', 'FontSize', 12);
grid on;

for i = 1:3
    for j = 1:5  % Jacobi(1) + 4个SOR(2-5)，共5列
        % 调整柱子偏移量，避免标注重叠
        text(i + (j-3)*0.15, bar_data(i, j) + 2, ...
            num2str(bar_data(i, j)), ...
            'FontSize', 10, 'HorizontalAlignment', 'center');
    end
end