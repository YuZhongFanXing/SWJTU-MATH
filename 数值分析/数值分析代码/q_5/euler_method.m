function [x, y] = euler_method(f, x0, y0, h, x_end)
    % 欧拉方法求解常微分方程初值问题
    % 输入参数：
    %   f: 函数句柄，表示 y' = f(x, y)
    %   x0, y0: 初始条件
    %   h: 步长
    %   x_end: 积分终点
    % 输出：
    %   x: x值的向量
    %   y: 对应的y值向量
    
    % 计算步数
    n_steps = ceil((x_end - x0) / h);
    
    % 调整步长以确保到达终点
    if n_steps * h < x_end - x0
        n_steps = n_steps + 1;
    end
    
    % 初始化数组
    x = zeros(1, n_steps + 1);
    y = zeros(1, n_steps + 1);
    
    % 设置初始值
    x(1) = x0;
    y(1) = y0;
    
    % 应用欧拉方法
    for i = 1:n_steps
        % 如果下一步会超出终点，调整步长
        if x(i) + h > x_end
            h_final = x_end - x(i);
            x(i+1) = x_end;
        else
            h_final = h;
            x(i+1) = x(i) + h_final;
        end
        
        % 欧拉公式: y_{n+1} = y_n + h*f(x_n, y_n)
        y(i+1) = y(i) + h_final * f(x(i), y(i));
    end
end