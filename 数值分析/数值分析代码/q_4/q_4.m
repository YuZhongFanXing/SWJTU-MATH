clear; clc;

% 定义被积函数
f1 = @(x) exp(-x.^2).*sin(10*x) + 4;
f2 = @(x) sin(5*x)./x.^3;
f3 = @(x) (10./x).^2.*sin(10./x);

% 积分区间
a1 = 1; b1 = 3;
a2 = 2*pi; b2 = 4*pi;
a3 = 1; b3 = 3;

% 分割数
n_values = [16,32,64,128,256,512,1024,2048,4096];

% 存储结果 [n, 梯形, Simpson, Cotes]
results1 = zeros(length(n_values),4);
results2 = zeros(length(n_values),4);
results3 = zeros(length(n_values),4);

% 计算积分
for i = 1:length(n_values)
    n = n_values(i);
    results1(i,:) = [n, composite_trapezoidal(f1,a1,b1,n), composite_simpson(f1,a1,b1,n), composite_cotes(f1,a1,b1,n)];
    results2(i,:) = [n, composite_trapezoidal(f2,a2,b2,n), composite_simpson(f2,a2,b2,n), composite_cotes(f2,a2,b2,n)];
    results3(i,:) = [n, composite_trapezoidal(f3,a3,b3,n), composite_simpson(f3,a3,b3,n), composite_cotes(f3,a3,b3,n)];
    fprintf('n=%d 完成\n', n);
end

% 显示结果
fprintf('\n=== 积分1结果 ===\n');
disp(array2table(results1, 'VariableNames', {'n', '梯形', 'Simpson', 'Cotes'}));

fprintf('\n=== 积分2结果 ===\n');
disp(array2table(results2, 'VariableNames', {'n', '梯形', 'Simpson', 'Cotes'}));

fprintf('\n=== 积分3结果 ===\n');
disp(array2table(results3, 'VariableNames', {'n', '梯形', 'Simpson', 'Cotes'}));

% 绘制收敛图
figure;

subplot(1,3,1);
plot(n_values, results1(:,2), 'o-', n_values, results1(:,3), 's-', n_values, results1(:,4), 'd-');
set(gca, 'XScale', 'log');
title('积分1'); legend('梯形','Simpson','Cotes');

subplot(1,3,2);
plot(n_values, results2(:,2), 'o-', n_values, results2(:,3), 's-', n_values, results2(:,4), 'd-');
set(gca, 'XScale', 'log');
title('积分2'); legend('梯形','Simpson','Cotes');

subplot(1,3,3);
plot(n_values, results3(:,2), 'o-', n_values, results3(:,3), 's-', n_values, results3(:,4), 'd-');
set(gca, 'XScale', 'log');
title('积分3'); legend('梯形','Simpson','Cotes');

% 绘制误差图（使用最大n值作为参考）
figure;

ref1 = results1(end,4); % 使用Cotes方法最大n值结果作为参考
ref2 = results2(end,4);
ref3 = results3(end,4);

subplot(1,3,1);
loglog(n_values, abs(results1(:,2)-ref1), 'o-', ...
       n_values, abs(results1(:,3)-ref1), 's-', ...
       n_values, abs(results1(:,4)-ref1), 'd-');
title('积分1误差'); legend('梯形','Simpson','Cotes'); grid on;

subplot(1,3,2);
loglog(n_values, abs(results2(:,2)-ref2), 'o-', ...
       n_values, abs(results2(:,3)-ref2), 's-', ...
       n_values, abs(results2(:,4)-ref2), 'd-');
title('积分2误差'); legend('梯形','Simpson','Cotes'); grid on;

subplot(1,3,3);
loglog(n_values, abs(results3(:,2)-ref3), 'o-', ...
       n_values, abs(results3(:,3)-ref3), 's-', ...
       n_values, abs(results3(:,4)-ref3), 'd-');
title('积分3误差'); legend('梯形','Simpson','Cotes'); grid on;