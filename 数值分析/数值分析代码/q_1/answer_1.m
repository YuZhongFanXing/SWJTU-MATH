fprintf('=========== 问题(1): 求解线性方程组 ===========\n');

%% 给定数据
A = [10, 7, 8, 7;
     7, 5, 6, 5;
     8, 6, 10, 9;
     7, 5, 9, 10];
b = [32; 23; 33; 31];
x_exact = [1; 1; 1; 1];  % 精确解

fprintf('系数矩阵 A:\n');
disp(A);
fprintf('右端项 b:\n');
disp(b);
fprintf('精确解 x_exact:\n');
disp(x_exact);

%% (1) 使用高斯消元法求解
fprintf('\n--- 高斯消元法求解结果 ---\n');
x_gauss = gauss_elimination(A, b);
fprintf('高斯消元法解: [%.10f, %.10f, %.10f, %.10f]\n', x_gauss);
fprintf('与精确解的误差 (二范数): %.10e\n', norm(x_gauss - x_exact, 2));

%% (1) 使用列主元消元法求解
fprintf('\n--- 列主元消元法求解结果 ---\n');
x_pivot = column_pivot_elimination(A, b);
fprintf('列主元消元法解: [%.10f, %.10f, %.10f, %.10f]\n', x_pivot);
fprintf('与精确解的误差 (二范数): %.10e\n', norm(x_pivot - x_exact, 2));

%% 计算条件数
cond_A = cond(A, 2);
fprintf('\n矩阵A的条件数 cond(A) = %.8e\n', cond_A);
if cond_A > 1000
    fprintf('这是一个病态矩阵，条件数很大，小的扰动可能导致解的巨大变化。\n');
end

fprintf('\n\n=========== 问题(2): 扰动分析 ===========\n');

%% 步骤1：确定原始数据
fprintf('\n--- 步骤1：确定原始数据 ---\n');
fprintf('原始矩阵 A:\n');
disp(A);
fprintf('右端项 b:\n');
disp(b);
fprintf('精确解 x:\n');
disp(x_exact);
fprintf('扰动后矩阵 A + δA:\n');
A_perturbed = [10, 7, 8.1, 7.2;
               7.08, 5.04, 6, 5;
               8, 5.98, 9.89, 9;
               6.99, 4.99, 9, 9.98];
disp(A_perturbed);

%% 步骤2：求解扰动后的方程组
fprintf('\n--- 步骤2：求解扰动后的方程组 ---\n');
fprintf('求解方程组 (A+δA)x'' = b，得到 x'' = x + δx\n');
x_perturbed = column_pivot_elimination(A_perturbed, b);
fprintf('扰动后的解 x'' (使用列主元消元法):\n');
disp(x_perturbed);

%% 步骤3：计算解的偏差和相对误差
fprintf('\n--- 步骤3：计算解的偏差和相对误差 ---\n');
% 计算解的扰动 δx
delta_x = x_perturbed - x_exact;
fprintf('解的扰动 δx = x'' - x:\n');
disp(delta_x);

% 计算相对误差
norm_x = norm(x_exact, 2);
norm_delta_x = norm(delta_x, 2);
relative_error = norm_delta_x / norm_x;

fprintf('精确解的二范数 ||x||₂ = %.8f\n', norm_x);
fprintf('解扰动的二范数 ||δx||₂ = %.8f\n', norm_delta_x);
fprintf('解的相对误差 rel_err = ||δx||₂/||x||₂ = %.8e\n', relative_error);

%% 步骤4：计算矩阵的扰动和相对误差
fprintf('\n--- 步骤4：计算矩阵的扰动和相对误差 ---\n');
% 计算扰动矩阵 δA
deltaA = A_perturbed - A;
fprintf('矩阵的扰动 δA = (A+δA) - A:\n');
disp(deltaA);

% 计算矩阵相对误差
norm_A = norm(A, 2);
norm_deltaA = norm(deltaA, 2);
relative_deltaA = norm_deltaA / norm_A;

fprintf('原始矩阵的二范数 ||A||₂ = %.8f\n', norm_A);
fprintf('矩阵扰动的二范数 ||δA||₂ = %.8f\n', norm_deltaA);
fprintf('矩阵的相对误差 rel_pert = ||δA||₂/||A||₂ = %.8e\n', relative_deltaA);

%% 步骤5：计算条件数和理论上界
fprintf('\n--- 步骤5：计算条件数和理论上界 ---\n');
% 计算条件数
cond_A = cond(A, 2);
fprintf('矩阵A的条件数 cond(A) = ||A||₂·||A⁻¹||₂ = %.8f\n', cond_A);

% 计算A的逆矩阵的二范数（验证用）
A_inv = inv(A);
norm_A_inv = norm(A_inv, 2);
fprintf('验证：||A⁻¹||₂ = %.8f\n', norm_A_inv);
fprintf('验证：||A||₂ = %.8f\n', norm_A);
fprintf('验证：||A||₂·||A⁻¹||₂ = %.8f\n', norm_A * norm_A_inv);

% 计算理论界限
fprintf('\n计算理论界限：\n');
fprintf('公式：bound = cond(A)·rel_pert / (1 - cond(A)·rel_pert)\n');
fprintf('其中：cond(A) = %.8f，rel_pert = %.8e\n', cond_A, relative_deltaA);

if cond_A * relative_deltaA < 1
    theoretical_bound = (cond_A * relative_deltaA) / (1 - cond_A * relative_deltaA);
    fprintf('计算过程：bound = (%.8f × %.8e) / (1 - %.8f × %.8e)\n', ...
            cond_A, relative_deltaA, cond_A, relative_deltaA);
    fprintf('理论界限 bound = %.8e\n', theoretical_bound);
else
    theoretical_bound = inf;
    fprintf('注意：cond(A)·rel_pert = %.8f ≥ 1，公式分母非正\n', cond_A * relative_deltaA);
end

%% 步骤6：比较和分析
fprintf('\n--- 步骤6：比较和分析 ---\n');
fprintf('实际相对误差 rel_err = %.8e\n', relative_error);
fprintf('理论界限 bound = %.8e\n', theoretical_bound);

if theoretical_bound < inf
    holds = (relative_error <= theoretical_bound);
    if holds
        fprintf('比较结果：rel_err (%.8e) ≤ bound (%.8e) ✓\n', relative_error, theoretical_bound);
        fprintf('结论：条件数公式成立\n');
    else
        fprintf('比较结果：rel_err (%.8e) > bound (%.8e) ✗\n', relative_error, theoretical_bound);
        fprintf('结论：条件数公式不成立\n');
    end
else
    fprintf('无法比较：理论界限为无穷大\n');
end

% 计算误差放大倍数
fprintf('\n误差放大分析：\n');
error_amplification = relative_error / relative_deltaA;
fprintf('误差放大倍数 = rel_err / rel_pert = %.8e / %.8e = %.8f\n', ...
        relative_error, relative_deltaA, error_amplification);
fprintf('条件数 cond(A) = %.8f\n', cond_A);
fprintf('放大倍数与条件数的比值 = %.8f / %.8f = %.8f\n', ...
        error_amplification, cond_A, error_amplification / cond_A);

