function [coeff, y_fit, sse, r_squared, best_order, best_coeff] = fit_poly(x, y, orders)

    n_orders = length(orders);
    coeff = cell(n_orders, 1);
    y_fit = cell(n_orders, 1);
    sse = zeros(n_orders, 1);
    r_squared = zeros(n_orders, 1);
    
    % 计算总平方和
    y_mean = mean(y);
    ss_total = sum((y - y_mean).^2);
    
    % 对每个阶数进行拟合
    for i = 1:n_orders
        order = orders(i);
             
        % 构建范德蒙德矩阵
        A = vander(x);
        
        % 取后order+1列（从常数项到最高次项）
        A = A(:, end-order:end);
        
        % 使用正规方程求解系数（最小二乘法）
        % 更稳定的方法：(A'*A) \ (A'*y')
        coeff_normal = (A' * A) \ (A' * y');
        coeff{i} = coeff_normal';
        
        % 计算拟合值
        y_fit{i} = A * coeff_normal;
        
        % 确保y_fit是行向量（与y保持一致）
        if size(y_fit{i}, 2) == 1
            y_fit{i} = y_fit{i}';
        end
        
        % 计算SSE
        residuals = y - y_fit{i};
        sse(i) = sum(residuals.^2);
        
        % 计算R²
        r_squared(i) = 1 - sse(i)/ss_total;
    end
    
    % 找到最佳拟合（基于R²最大）
    [~, best_idx] = max(r_squared);
    best_order = orders(best_idx);
    best_coeff = coeff{best_idx};
end