% 定义微分方程 y' = -50y + 49sin(x) + 51cos(x)
f = @(x, y) -50*y + 49*sin(x) + 51*cos(x);

% 定义精确解 y(x) = sin(x) + cos(x)
exact_solution = @(x) sin(x) + cos(x);

% 定义初始条件和积分区间
x0 = 0;
y0 = 1;
x_end = 10;

% 定义要测试的步长
step_sizes = [1, 0.1, 0.025, 0.01];
n_methods = 2; % 两种方法：欧拉和RK4
n_steps = length(step_sizes);

% 为每个步长创建图形
for s_idx = 1:n_steps
    h = step_sizes(s_idx);
    
    % 计算欧拉方法的结果
    [x_euler, y_euler] = euler_method(f, x0, y0, h, x_end);
    
    % 计算4阶龙格-库塔方法的结果
    [x_rk4, y_rk4] = runge_kutta_4(f, x0, y0, h, x_end);
    
    % 计算精确解在更密集的点上的值，用于绘制平滑曲线
    x_exact = linspace(x0, x_end, 1000);
    y_exact = exact_solution(x_exact);
    
    % 创建图形
    figure('Position', [100, 100, 1200, 800]);
    
    % 绘制比较图 - 修改为实心点
    subplot(2, 2, 1);
    plot(x_exact, y_exact, 'k-', 'LineWidth', 2, 'DisplayName', '精确解');
    hold on;
    plot(x_euler, y_euler, 'r-', 'LineWidth', 1.5, 'MarkerFaceColor', 'r', ...
        'Marker', 'o', 'MarkerSize', 5, 'DisplayName', '欧拉方法');
    plot(x_rk4, y_rk4, 'b-', 'LineWidth', 1.5, 'MarkerFaceColor', 'b', ...
        'Marker', 's', 'MarkerSize', 5, 'DisplayName', '4阶RK方法');
    hold off;
    xlabel('x');
    ylabel('y(x)');
    title(sprintf('步长 h = %.3f', h));
    legend('Location', 'best');
    grid on;
    
    % 绘制误差图 - 修改为实心点
    subplot(2, 2, 2);
    % 计算在欧拉方法点上的精确值
    y_exact_euler = exact_solution(x_euler);
    error_euler = abs(y_euler - y_exact_euler);
    
    % 计算在RK4方法点上的精确值
    y_exact_rk4 = exact_solution(x_rk4);
    error_rk4 = abs(y_rk4 - y_exact_rk4);
    
    plot(x_euler, error_euler, 'r-', 'LineWidth', 1.5, 'MarkerFaceColor', 'r', ...
        'Marker', 'o', 'MarkerSize', 5, 'DisplayName', '欧拉方法误差');
    hold on;
    plot(x_rk4, error_rk4, 'b-', 'LineWidth', 1.5, 'MarkerFaceColor', 'b', ...
        'Marker', 's', 'MarkerSize', 5, 'DisplayName', '4阶RK方法误差');
    hold off;
    xlabel('x');
    ylabel('绝对误差');
    title('绝对误差比较');
    legend('Location', 'best');
    grid on;
    
    % 计算并显示最大误差和平均误差
    subplot(2, 2, 3);
    max_error_euler = max(error_euler);
    max_error_rk4 = max(error_rk4);
    mean_error_euler = mean(error_euler);
    mean_error_rk4 = mean(error_rk4);
    
    % 创建文本显示
    text(0.1, 0.8, sprintf('欧拉方法：'), 'FontSize', 12);
    text(0.1, 0.7, sprintf('  最大误差：%.4e', max_error_euler), 'FontSize', 12);
    text(0.1, 0.6, sprintf('  平均误差：%.4e', mean_error_euler), 'FontSize', 12);
    
    text(0.1, 0.4, sprintf('4阶RK方法：'), 'FontSize', 12);
    text(0.1, 0.3, sprintf('  最大误差：%.4e', max_error_rk4), 'FontSize', 12);
    text(0.1, 0.2, sprintf('  平均误差：%.4e', mean_error_rk4), 'FontSize', 12);
    
    % 计算误差比
    if max_error_euler > 0
        error_ratio = max_error_rk4 / max_error_euler;
        text(0.1, 0.1, sprintf('误差比(RK/欧拉)：%.4f', error_ratio), 'FontSize', 12);
    end
    
    axis off;
    title('误差统计');
    
    % 绘制对数误差图 - 修改为实心点
    subplot(2, 2, 4);
    semilogy(x_euler, error_euler, 'r-', 'LineWidth', 1.5, 'MarkerFaceColor', 'r', ...
        'Marker', 'o', 'MarkerSize', 5, 'DisplayName', '欧拉方法误差');
    hold on;
    semilogy(x_rk4, error_rk4, 'b-', 'LineWidth', 1.5, 'MarkerFaceColor', 'b', ...
        'Marker', 's', 'MarkerSize', 5, 'DisplayName', '4阶RK方法误差');
    hold off;
    xlabel('x');
    ylabel('对数绝对误差');
    title('对数误差图');
    legend('Location', 'best');
    grid on;
    
    % 调整图形布局
    sgtitle(sprintf('步长 h = %.3f 时的数值解与精确解比较', h), 'FontSize', 14);
end

%% 创建综合比较图
figure('Position', [100, 100, 1400, 800]);
colors = lines(n_steps); % 为不同步长生成不同颜色

% 绘制不同步长下欧拉方法的误差 - 修改为实心点
subplot(2, 3, 1);
for s_idx = 1:n_steps
    h = step_sizes(s_idx);
    [x_euler, y_euler] = euler_method(f, x0, y0, h, x_end);
    y_exact_euler = exact_solution(x_euler);
    error_euler = abs(y_euler - y_exact_euler);
    
    % 使用实心点
    plot(x_euler, error_euler, '-', 'LineWidth', 1.5, ...
        'MarkerFaceColor', colors(s_idx, :), 'MarkerEdgeColor', colors(s_idx, :), ...
        'Marker', 'o', 'MarkerSize', 5, 'DisplayName', sprintf('h=%.3f', h));
    hold on;
end
hold off;
xlabel('x');
ylabel('绝对误差');
title('欧拉方法不同步长的误差');
legend('Location', 'best');
grid on;

% 绘制不同步长下4阶RK方法的误差 - 修改为实心点
subplot(2, 3, 2);
for s_idx = 1:n_steps
    h = step_sizes(s_idx);
    [x_rk4, y_rk4] = runge_kutta_4(f, x0, y0, h, x_end);
    y_exact_rk4 = exact_solution(x_rk4);
    error_rk4 = abs(y_rk4 - y_exact_rk4);
    
    % 使用实心正方形
    plot(x_rk4, error_rk4, '-', 'LineWidth', 1.5, ...
        'MarkerFaceColor', colors(s_idx, :), 'MarkerEdgeColor', colors(s_idx, :), ...
        'Marker', 's', 'MarkerSize', 5, 'DisplayName', sprintf('h=%.3f', h));
    hold on;
end
hold off;
xlabel('x');
ylabel('绝对误差');
title('4阶RK方法不同步长的误差');
legend('Location', 'best');
grid on;

% 绘制最大误差与步长的关系 - 修改为实心点
subplot(2, 3, 3);
max_errors_euler = zeros(1, n_steps);
max_errors_rk4 = zeros(1, n_steps);

for s_idx = 1:n_steps
    h = step_sizes(s_idx);
    
    % 计算欧拉方法的误差
    [x_euler, y_euler] = euler_method(f, x0, y0, h, x_end);
    y_exact_euler = exact_solution(x_euler);
    error_euler = abs(y_euler - y_exact_euler);
    max_errors_euler(s_idx) = max(error_euler);
    
    % 计算4阶RK方法的误差
    [x_rk4, y_rk4] = runge_kutta_4(f, x0, y0, h, x_end);
    y_exact_rk4 = exact_solution(x_rk4);
    error_rk4 = abs(y_rk4 - y_exact_rk4);
    max_errors_rk4(s_idx) = max(error_rk4);
end

% 使用实心点
loglog(step_sizes, max_errors_euler, 'ro-', 'LineWidth', 2, ...
    'MarkerFaceColor', 'r', 'MarkerSize', 8, 'DisplayName', '欧拉方法');
hold on;
loglog(step_sizes, max_errors_rk4, 'bs-', 'LineWidth', 2, ...
    'MarkerFaceColor', 'b', 'MarkerSize', 8, 'DisplayName', '4阶RK方法');

% 添加参考线：h^1 和 h^4（理论误差阶数）
h_theory = linspace(min(step_sizes), max(step_sizes), 100);
ref_h1 = 10 * h_theory; % 调整比例因子以便显示
ref_h4 = 10 * h_theory.^4; % 调整比例因子以便显示

loglog(h_theory, ref_h1, 'k--', 'LineWidth', 1, 'DisplayName', 'O(h)');
loglog(h_theory, ref_h4, 'k:', 'LineWidth', 1, 'DisplayName', 'O(h^4)');

hold off;
xlabel('步长 h');
ylabel('最大误差');
title('最大误差与步长的关系（对数坐标）');
legend('Location', 'best');
grid on;

% 绘制平均误差与步长的关系 - 修改为实心点
subplot(2, 3, 4);
mean_errors_euler = zeros(1, n_steps);
mean_errors_rk4 = zeros(1, n_steps);

for s_idx = 1:n_steps
    h = step_sizes(s_idx);
    
    % 计算欧拉方法的误差
    [x_euler, y_euler] = euler_method(f, x0, y0, h, x_end);
    y_exact_euler = exact_solution(x_euler);
    error_euler = abs(y_euler - y_exact_euler);
    mean_errors_euler(s_idx) = mean(error_euler);
    
    % 计算4阶RK方法的误差
    [x_rk4, y_rk4] = runge_kutta_4(f, x0, y0, h, x_end);
    y_exact_rk4 = exact_solution(x_rk4);
    error_rk4 = abs(y_rk4 - y_exact_rk4);
    mean_errors_rk4(s_idx) = mean(error_rk4);
end

% 使用实心点
loglog(step_sizes, mean_errors_euler, 'ro-', 'LineWidth', 2, ...
    'MarkerFaceColor', 'r', 'MarkerSize', 8, 'DisplayName', '欧拉方法');
hold on;
loglog(step_sizes, mean_errors_rk4, 'bs-', 'LineWidth', 2, ...
    'MarkerFaceColor', 'b', 'MarkerSize', 8, 'DisplayName', '4阶RK方法');
hold off;
xlabel('步长 h');
ylabel('平均误差');
title('平均误差与步长的关系（对数坐标）');
legend('Location', 'best');
grid on;

% 显示误差表格
subplot(2, 3, [5, 6]);
% 创建表格数据
method_names = {'欧拉方法', '4阶RK方法'};
data = cell(n_steps+1, 3);
data{1, 1} = '步长 h';
data{1, 2} = '欧拉最大误差';
data{1, 3} = 'RK4最大误差';

for s_idx = 1:n_steps
    data{s_idx+1, 1} = sprintf('%.3f', step_sizes(s_idx));
    data{s_idx+1, 2} = sprintf('%.4e', max_errors_euler(s_idx));
    data{s_idx+1, 3} = sprintf('%.4e', max_errors_rk4(s_idx));
end

% 将数据转换为uitable（如果可用）
if exist('uitable', 'file')
    t = uitable('Data', data, 'ColumnName', {'步长', '欧拉最大误差', 'RK4最大误差'}, ...
        'Position', [20, 20, 450, 150]);
else
    % 文本显示
    text(0, 0.9, '误差统计表:', 'FontSize', 14, 'FontWeight', 'bold');
    text(0, 0.8, sprintf('%12s %20s %20s', '步长', '欧拉最大误差', 'RK4最大误差'), ...
        'FontSize', 12, 'FontWeight', 'bold');
    
    for s_idx = 1:n_steps
        text(0, 0.7 - 0.1*s_idx, ...
            sprintf('%12.3f %20.4e %20.4e', step_sizes(s_idx), ...
            max_errors_euler(s_idx), max_errors_rk4(s_idx)), 'FontSize', 12);
    end
end

axis off;
title('最大误差统计表');

sgtitle('欧拉方法与4阶龙格-库塔方法比较分析', 'FontSize', 16);

%% 输出结果汇总
fprintf('\n==================== 结果汇总 ====================\n');
fprintf('步长\t\t欧拉最大误差\t\tRK4最大误差\t\t误差比(RK/欧拉)\n');
fprintf('----\t\t------------\t\t------------\t\t----------------\n');
for s_idx = 1:n_steps
    h = step_sizes(s_idx);
    ratio = max_errors_rk4(s_idx) / max_errors_euler(s_idx);
    fprintf('%.3f\t\t%.4e\t\t%.4e\t\t%.6f\n', ...
        h, max_errors_euler(s_idx), max_errors_rk4(s_idx), ratio);
end