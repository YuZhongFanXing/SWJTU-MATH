% 原始数据
x = 1:10;
y = [34.6588, 40.3719, 14.6448, -14.2721, -13.3570, ...
     24.8234, 75.2795, 103.5743, 97.4847, 78.2392];

fprintf('==============================================\n');
fprintf('           多项式拟合与插值分析\n');
fprintf('==============================================\n\n');

%% 第一部分：多项式拟合
fprintf('(1) 多项式拟合分析\n');
fprintf('----------------------------------------------\n');

orders = [3, 4, 5, 6];
[coeff_fit, y_fit, sse, r_squared, best_order, best_coeff] = fit_poly(x, y, orders);

% 显示拟合结果
for i = 1:length(orders)
    fprintf('阶数 %d:\n', orders(i));
    fprintf('  多项式系数（从高次到低次）:\n');
    fprintf('  ');
    for j = 1:length(coeff_fit{i})
        fprintf('  a%d = %10.6f', orders(i)-j+1, coeff_fit{i}(j));
    end
    fprintf('\n');
    fprintf('  SSE = %10.6f, R² = %8.6f\n\n', sse(i), r_squared(i));
end

fprintf('最佳拟合阶数: %d\n', best_order);
fprintf('最佳拟合多项式 R² = %8.6f\n\n', r_squared(orders==best_order));

% 绘制拟合结果图
figure('Position', [100, 100, 1200, 800]);
subplot(2, 2, 1);

% 绘制原始数据
plot(x, y, 'ko', 'MarkerSize', 10, 'LineWidth', 2, 'DisplayName', '原始数据');
hold on;
grid on;

% 定义更密集的点用于绘制平滑曲线
x_dense = linspace(min(x), max(x), 1000);

% 绘制不同阶数的拟合曲线
colors = {'r-', 'g-', 'b-', 'm-'};
for i = 1:length(orders)
    y_dense = polyval(coeff_fit{i}, x_dense);
    plot(x_dense, y_dense, colors{i}, 'LineWidth', 1.5, ...
         'DisplayName', sprintf('%d阶拟合', orders(i)));
end

xlabel('x', 'FontSize', 12);
ylabel('y', 'FontSize', 12);
title('不同阶数多项式拟合比较', 'FontSize', 14);
legend('Location', 'best');
xlim([0.5, 10.5]);

% 绘制拟合残差图
subplot(2, 2, 2);
hold on; grid on;

% 定义残差图的颜色和标记
marker_styles = {'ro-', 'gs-', 'bd-', 'mv-'};
for i = 1:length(orders)
    residuals = y - y_fit{i};
    plot(x, residuals, marker_styles{i}, 'LineWidth', 1.5, ...
         'MarkerSize', 8, 'DisplayName', sprintf('%d阶残差', orders(i)));
end
plot([0, 11], [0, 0], 'k--', 'LineWidth', 1);
xlabel('x', 'FontSize', 12);
ylabel('残差', 'FontSize', 12);
title('拟合残差分析', 'FontSize', 14);
legend('Location', 'best');
xlim([0.5, 10.5]);

% 绘制误差比较图
subplot(2, 2, 3);
bar(orders, sse, 'FaceColor', [0.2, 0.6, 0.8]);
xlabel('多项式阶数', 'FontSize', 12);
ylabel('SSE (误差平方和)', 'FontSize', 12);
title('不同阶数拟合误差比较', 'FontSize', 14);
grid on;

% 绘制R²比较图
subplot(2, 2, 4);
bar(orders, r_squared, 'FaceColor', [0.8, 0.4, 0.2]);
xlabel('多项式阶数', 'FontSize', 12);
ylabel('R² (决定系数)', 'FontSize', 12);
title('不同阶数拟合优度比较', 'FontSize', 14);
grid on;
ylim([0, 1.1]);

%% 第二部分：插值多项式
fprintf('\n(2) 插值多项式分析\n');
fprintf('----------------------------------------------\n');

% 生成插值点
xi = linspace(min(x), max(x), 1000);
[coeff_interp, y_interp, error] = interp_poly(x, y, xi);

fprintf('插值多项式阶数: %d (n-1阶，n=10)\n', length(x)-1);
fprintf('插值多项式在原始点上的L2误差: %10.6e\n\n', error);

% 显示插值多项式系数
fprintf('9阶拉格朗日插值多项式系数（从高次到低次）:\n');
for i = 1:length(coeff_interp)
    power = length(coeff_interp) - i;  % 计算x的幂次
    if power == 0
        fprintf('  x^%d 项系数: %12.6f\n', power, coeff_interp(i));
    else
        fprintf('  x^%d 项系数: %12.6f\n', power, coeff_interp(i));
    end
end

% 也可以写成多项式形式
fprintf('\n多项式形式:\n');
fprintf('y = ');
for i = 1:length(coeff_interp)
    power = length(coeff_interp) - i;
    if i == 1
        fprintf('%12.6fx^%d', coeff_interp(i), power);
    elseif i == length(coeff_interp)
        fprintf(' %+12.6f', coeff_interp(i));
    else
        fprintf(' %+12.6fx^%d', coeff_interp(i), power);
    end
end
fprintf('\n\n');

% 绘制插值结果
figure('Position', [100, 100, 1000, 800]);

% 绘制插值结果
subplot(2, 2, [1, 2]);
plot(x, y, 'ko', 'MarkerSize', 10, 'LineWidth', 2, 'DisplayName', '原始数据');
hold on; grid on;
plot(xi, y_interp, 'r-', 'LineWidth', 1.5, 'DisplayName', '9阶拉格朗日插值多项式');
xlabel('x', 'FontSize', 12);
ylabel('y', 'FontSize', 12);
title('9阶拉格朗日插值多项式 (通过所有数据点)', 'FontSize', 14);
legend('Location', 'best');
xlim([0.5, 10.5]);