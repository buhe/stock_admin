import { useState, useEffect } from 'react'
import { Table, Form, Input, Button, InputNumber, Card, Statistic, Row, Col, message, Modal, Space, Select, List } from 'antd'
import { PlusOutlined, ShoppingOutlined, DeleteOutlined, HistoryOutlined, InfoCircleOutlined } from '@ant-design/icons'
import './App.css'

function App() {
  const [buyStrategyPercent, setBuyStrategyPercent] = useState(5);
  const [sellStrategyPercent, setSellStrategyPercent] = useState(5);
  const [groupsNumber, setGroupsNumber] = useState(3);
  const [strategyResults, setStrategyResults] = useState([]);
  const [form] = Form.useForm();
  const [sellForm] = Form.useForm();
  const [initialCapital, setInitialCapital] = useState(() => {
    const savedCapital = localStorage.getItem('initialCapital');
    return savedCapital ? parseFloat(savedCapital) : 20000;
  });
  const [stocks, setStocks] = useState(() => {
    const savedStocks = localStorage.getItem('stocks');
    return savedStocks ? JSON.parse(savedStocks) : [];
  });
  // 判断日期是否在半年内的函数
  const isWithinSixMonths = (dateString) => {
    const recordDate = new Date(dateString);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return recordDate >= sixMonthsAgo;
  };

  const [operationLogs, setOperationLogs] = useState(() => {
    const savedLogs = localStorage.getItem('operationLogs');
    const allLogs = savedLogs ? JSON.parse(savedLogs) : [];
    // 只保留半年内的记录
    return allLogs.filter(log => isWithinSixMonths(log.timestamp));
  });
  
  // 添加详情Modal的状态
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedStockDetails, setSelectedStockDetails] = useState(null);
  const [purchaseRecords, setPurchaseRecords] = useState([]);
  const [profitStats, setProfitStats] = useState({});
const [monthlyProfitStats, setMonthlyProfitStats] = useState({});
const [selectedMonth, setSelectedMonth] = useState('');

const calculateProfitStats = () => {
  const stats = {};
  const monthlyStats = {};

  operationLogs.forEach(log => {
    if (log.type === '卖出股票' && log.profit) {
      // 累计统计
      const key = log.content.match(/(.+?)\((.+?)\)/);
      if (key) {
        const symbol = key[2];
        const stockName = key[1];
        
        // 累计统计
        stats[symbol] = stats[symbol] || { symbol, name: stockName, totalProfit: 0 };
        stats[symbol].totalProfit += log.profit;

        // 月度统计
        const date = new Date(log.timestamp);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const monthlyKey = `${symbol}-${monthKey}`;
        
        monthlyStats[monthlyKey] = monthlyStats[monthlyKey] || {
          symbol,
          month: monthKey,
          profit: 0
        };
        monthlyStats[monthlyKey].profit += log.profit;
      }
    }
  });

  setProfitStats(stats);
  setMonthlyProfitStats(monthlyStats);
};

useEffect(() => {
  calculateProfitStats();
}, [operationLogs]);

const [totalProfit, setTotalProfit] = useState(() => {
    const savedProfit = localStorage.getItem('totalProfit');
    return savedProfit ? parseFloat(savedProfit) : 0;
  });
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [addPurchaseModalVisible, setAddPurchaseModalVisible] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [addPurchaseForm] = Form.useForm();
  const [selectedStockForStrategy, setSelectedStockForStrategy] = useState(null);
  // 添加已删除记录的状态
  const [deletedRecords, setDeletedRecords] = useState(() => {
    const savedDeletedRecords = localStorage.getItem('deletedRecords');
    return savedDeletedRecords ? JSON.parse(savedDeletedRecords) : [];
  });
  // 添加删除确认对话框的状态
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // 策略计算函数
  const calculateStrategy = () => {
    const filteredStocks = selectedStockForStrategy 
      ? stocks.filter(stock => stock.symbol === selectedStockForStrategy)
      : stocks;
    const results = filteredStocks.flatMap(stock => {
      return Array.from({ length: groupsNumber }, (_, i) => ({
        key: `${stock.key}-${i + 1}`,
        name: stock.name,
        symbol: stock.symbol,
        group: i + 1,
        buyPrice: stock.costPrice * Math.pow(1 - buyStrategyPercent/100, i + 1),
        sellPrice: stock.costPrice * Math.pow(1 + sellStrategyPercent/100, i + 1),
        costPrice: stock.costPrice
      }));
    });
    setStrategyResults(results);
  };
  
  // 计算已用资金和剩余资金
  const usedCapital = stocks.reduce((sum, stock) => sum + (stock.quantity * stock.costPrice), 0);
  const remainingCapital = initialCapital - usedCapital;
  
  // 计算总资产（本金 + 盈利）
  const totalAssets = initialCapital + totalProfit;

  // 保存股票数据到本地存储
  useEffect(() => {
    localStorage.setItem('stocks', JSON.stringify(stocks));
  }, [stocks]);

  // 保存操作记录到本地存储
  useEffect(() => {
    // 保存前过滤掉超过半年的记录
    const recentLogs = operationLogs.filter(log => isWithinSixMonths(log.timestamp));
    localStorage.setItem('operationLogs', JSON.stringify(recentLogs));
  }, [operationLogs]);

  // 保存总盈利到本地存储
  useEffect(() => {
    localStorage.setItem('totalProfit', totalProfit.toString());
  }, [totalProfit]);
  
  // 保存已删除记录到本地存储
  useEffect(() => {
    localStorage.setItem('deletedRecords', JSON.stringify(deletedRecords));
  }, [deletedRecords]);

  // 添加操作记录
  const addOperationLog = (type, content, profit = null) => {
    const newLog = {
      key: Date.now().toString(),
      type,
      content,
      timestamp: new Date().toLocaleString(),
      profit
    };
    // 添加新记录的同时，过滤掉超过半年的旧记录
    const updatedLogs = [newLog, ...operationLogs].filter(log => isWithinSixMonths(log.timestamp));
    setOperationLogs(updatedLogs);
  };

  // 更新总资产
  const handleCapitalChange = (value) => {
    const oldValue = initialCapital;
    setInitialCapital(value);
    localStorage.setItem('initialCapital', value.toString());
    addOperationLog('资产变更', `总资产从 $${oldValue.toFixed(2)} 调整为 $${value.toFixed(2)}`);
  };

  // 添加新股票
  const onFinish = (values) => {
    const stockCost = values.quantity * values.costPrice;
    if (stockCost > remainingCapital) {
      message.error('剩余资金不足，无法新增该股票');
      return;
    }

    const newStock = {
      key: Date.now().toString(),
      symbol: values.symbol,
      name: values.name || values.symbol,
      quantity: Number(values.quantity),
      costPrice: Number(values.costPrice),
      totalCost: stockCost
    };
    
    setStocks([...stocks, newStock]);
    form.resetFields();
    message.success('股票添加成功');
    addOperationLog('新增股票', `新增 ${newStock.name}(${newStock.symbol}) ${newStock.quantity}股，单价 $${newStock.costPrice.toFixed(2)}，总成本 $${stockCost.toFixed(2)}`);
  };

  // 打开卖出对话框
  const handleSellClick = (stock) => {
    setSelectedStock(stock);
    setSellModalVisible(true);
    sellForm.setFieldsValue({
      quantity: stock.quantity,
      sellPrice: stock.costPrice
    });
  };
  
  // 打开详情对话框
  const handleDetailsClick = (stock) => {
    setSelectedStockDetails(stock);
    
    // 从操作日志中筛选出该股票的所有买入记录
    const records = operationLogs.filter(log => {
      return (log.type === '新增股票' || log.type === '追加买入') && 
             log.content.includes(`${stock.name}(${stock.symbol})`);
    }).map(log => {
      // 解析日志内容，提取数量和价格信息
      let quantity = 0;
      let price = 0;
      let recordId = log.key;
      
      if (log.type === '新增股票') {
        const match = log.content.match(/新增 .+?\(.+?\) (\d+)股，单价 \$(\d+\.\d+)/);
        if (match) {
          quantity = parseInt(match[1]);
          price = parseFloat(match[2]);
        }
      } else if (log.type === '追加买入') {
        const match = log.content.match(/追加(\d+)股，单价 \$(\d+\.\d+)/);
        if (match) {
          quantity = parseInt(match[1]);
          price = parseFloat(match[2]);
        }
      }
      
      return {
        key: recordId,
        type: log.type,
        quantity,
        price,
        timestamp: log.timestamp,
        stock: stock
      };
    });
    
    // 过滤掉已删除的记录
    const filteredRecords = records.filter(record => 
      !deletedRecords.includes(record.key)
    );
    
    setPurchaseRecords(filteredRecords);
    setDetailsModalVisible(true);
  };
  
  // 从详情弹窗中卖出股票
  const handleSellFromDetails = (record) => {
    // 保存当前记录信息，以便在卖出时使用
    const originalRecord = {
      ...record,
      originalPrice: record.price, // 保存原始买入价格
      isFromDetails: true // 标记是从详情页面卖出
    };
    setSelectedStock(originalRecord);
    setSellModalVisible(true);
    sellForm.setFieldsValue({
      quantity: record.quantity,
      sellPrice: record.price
    });
    setDetailsModalVisible(false);
  };
  
  // 处理删除记录按钮点击
  const handleDeleteRecordClick = (record) => {
    setRecordToDelete(record);
    setDeleteConfirmVisible(true);
  };
  
  // 确认删除记录
  const handleConfirmDelete = () => {
    if (recordToDelete) {
      // 将记录ID添加到已删除记录列表中
      setDeletedRecords([...deletedRecords, recordToDelete.key]);
      
      // 从当前显示的记录中移除该记录
      setPurchaseRecords(purchaseRecords.filter(record => record.key !== recordToDelete.key));
      
      // 添加删除操作记录
      addOperationLog(
        '删除记录', 
        `删除 ${recordToDelete.stock.name}(${recordToDelete.stock.symbol}) 的一条${recordToDelete.type === '新增股票' ? '首次买入' : '追加买入'}记录，买入数量: ${recordToDelete.quantity}股，买入价格: $${recordToDelete.price.toFixed(2)}`
      );
      
      message.success('记录已删除');
    }
    
    // 关闭确认对话框
    setDeleteConfirmVisible(false);
    setRecordToDelete(null);
  };

  // 处理卖出股票
  const handleSell = () => {
    sellForm.validateFields().then(values => {
      const { quantity: sellQuantity, sellPrice } = values;
      const stock = selectedStock;
      
      // 检查是否是从详情页面卖出（有isFromDetails属性）
      const isFromDetails = stock.isFromDetails === true;
      
      // 获取实际的股票对象（如果是从详情页面卖出，则需要获取真实的股票对象）
      const actualStock = isFromDetails ? stock.stock : stock;
      
      if (sellQuantity > actualStock.quantity) {
        message.error('卖出数量不能超过持有数量');
        return;
      }

      // 计算本次卖出的盈利
      const sellValue = sellQuantity * sellPrice;
      
      // 如果是从详情页面卖出，使用原始买入价格计算成本
      const costPrice = isFromDetails ? stock.originalPrice : actualStock.costPrice;
      const costValue = sellQuantity * costPrice;
      const profit = sellValue - costValue;

      // 更新总盈利
      setTotalProfit(prevProfit => prevProfit + profit);

      // 如果是从详情页面卖出，将该记录添加到已删除记录中
      if (isFromDetails) {
        // 将记录ID添加到已删除记录列表中
        setDeletedRecords([...deletedRecords, stock.key]);
        
        // 从当前显示的记录中移除该记录
        setPurchaseRecords(purchaseRecords.filter(record => record.key !== stock.key));
      }

      // 更新股票列表
      if (sellQuantity === actualStock.quantity) {
        // 全部卖出
        setStocks(stocks.filter(s => s.key !== actualStock.key));
      } else {
        // 部分卖出，需要重新计算成本价
        setStocks(stocks.map(s => {
          if (s.key === actualStock.key) {
            // 如果是从详情页面卖出，需要重新计算剩余股票的平均成本价
            if (isFromDetails) {
              // 计算总成本 = 当前总成本 - 卖出部分的成本
              const totalCost = s.quantity * s.costPrice - sellQuantity * costPrice;
              const remainingQuantity = s.quantity - sellQuantity;
              // 计算新的平均成本价
              const newCostPrice = remainingQuantity > 0 ? totalCost / remainingQuantity : 0;
              
              return {
                ...s,
                quantity: remainingQuantity,
                costPrice: newCostPrice
              };
            } else {
              // 普通卖出，只减少数量
              return {
                ...s,
                quantity: s.quantity - sellQuantity
              };
            }
          }
          return s;
        }));
      }

      setSellModalVisible(false);
      sellForm.resetFields();
      message.success('股票卖出成功');
      
      // 添加操作日志
      const stockName = isFromDetails ? actualStock.name : stock.name;
      const stockSymbol = isFromDetails ? actualStock.symbol : stock.symbol;
      
      addOperationLog(
        '卖出股票', 
        `卖出 ${stockName}(${stockSymbol}) ${sellQuantity}股，单价 $${sellPrice.toFixed(2)}，总收入 $${sellValue.toFixed(2)}`,
        profit
      );
    });
  };

  // 处理追加买入点击
  const handleAddPurchaseClick = (stock) => {
    setSelectedStock(stock);
    setAddPurchaseModalVisible(true);
    addPurchaseForm.setFieldsValue({
      quantity: 1,
      costPrice: stock.costPrice
    });
  };

  // 处理追加买入操作
  const handleAddPurchase = () => {
    addPurchaseForm.validateFields().then(values => {
      const { quantity, costPrice } = values;
      const newInvestment = quantity * costPrice;

      if (newInvestment > remainingCapital) {
        message.error('剩余资金不足，无法追加买入');
        return;
      }

      setStocks(stocks.map(stock => {
        if (stock.key === selectedStock.key) {
          const totalQuantity = stock.quantity + quantity;
          const averageCost = 
            ((stock.quantity * stock.costPrice) + newInvestment) / totalQuantity;

          return {
            ...stock,
            quantity: totalQuantity,
            costPrice: averageCost
          };
        }
        return stock;
      }));

      setAddPurchaseModalVisible(false);
      addPurchaseForm.resetFields();
      message.success('追加买入成功');
      addOperationLog(
        '追加买入', 
        `${selectedStock.name}(${selectedStock.symbol}) 追加${quantity}股，单价 $${costPrice.toFixed(2)}，总投入 $${newInvestment.toFixed(2)}`
      );
    });
  };

  // 操作记录列定义
  const logColumns = [
    {
      title: '操作类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '操作内容',
      dataIndex: 'content',
      key: 'content',
    },
    {
      title: '操作时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (value) => value ? (
        <span style={{ color: value >= 0 ? '#3f8600' : '#cf1322' }}>
          ${value.toFixed(2)}
        </span>
      ) : '-'
    }
  ];

  // 表格列定义
  const columns = [
    {
      title: '股票代码',
      dataIndex: 'symbol',
      key: 'symbol',
    },
    {
      title: '股票名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '持有数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '成本价',
      dataIndex: 'costPrice',
      key: 'costPrice',
      render: (value) => value.toFixed(2),
    },
    {
      title: '总成本',
      key: 'totalCost',
      render: (_, record) => (record.quantity * record.costPrice).toFixed(2),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleAddPurchaseClick(record)}
          >
            追加
          </Button>
          <Button
            type="primary"
            icon={<InfoCircleOutlined />}
            onClick={() => handleDetailsClick(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="container">
      <h1>股票资产管理</h1>
      
      {/* 总资产概览 */}
      <Card title="资产概览" className="summary-card" 

      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic 
              title="本金 ($)" 
              value={initialCapital}
              precision={2} 
              
              formatter={(value) => (
                <InputNumber
                  style={{ width: 150 }}
                  value={value}
                  onChange={handleCapitalChange}
                  min={0}
                  step={1000}
                  precision={2}
                  
                />
              )}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="总盈利 ($)" 
              value={totalProfit}
              prefix="$" 
              precision={2} 
               
              valueStyle={{ color: totalProfit >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="累计资产 ($)" 
              value={totalAssets}
              prefix="$" 
              precision={2} 
               
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="剩余资金 ($)" 
              value={remainingCapital}
              prefix="$" 
              precision={2} 
               
              valueStyle={{ color: remainingCapital >= 0 ? 'black' : 'red' }}
            />
          </Col>
        </Row>
      </Card>


      
      {/* 添加股票表单 */}
      <Card title="新增股票" className="form-card">
        <Form
          form={form}
          name="add_stock"
          layout="inline"
          onFinish={onFinish}
        >
          <Form.Item
            name="symbol"
            rules={[{ required: true, message: '请输入股票代码' }]}
          >
            <Input placeholder="股票代码" />
          </Form.Item>
          
          <Form.Item name="name">
            <Input placeholder="股票名称 (可选)" />
          </Form.Item>
          
          <Form.Item
            name="quantity"
            rules={[{ required: true, message: '请输入持有数量' }]}
          >
            <InputNumber 
              min={1} 
              placeholder="持有数量" 
              style={{ width: 120 }} 
            />
          </Form.Item>
          
          <Form.Item
            name="costPrice"
            rules={[{ required: true, message: '请输入成本价' }]}
          >
            <InputNumber 
              min={0.01} 
              step={0.01} 
              placeholder="成本价" 
              style={{ width: 120 }} 
            />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<PlusOutlined />}
            >
              新增
            </Button>
          </Form.Item>
        </Form>
      </Card>


      
      {/* 股票列表 */}
      <Card 
        title="股票列表" 
        className="table-card"
      >
        <Table 
          dataSource={stocks} 
          columns={columns} 
          pagination={false} 
          locale={{ emptyText: '暂无股票，请添加股票' }}
        />
      </Card>



      {/* 量化策略模块 */}
      <Card className="strategy-card" title="量化策略">
        <Form layout="inline">
          <Form.Item label="选择股票" style={{ minWidth: 200 }}>
            <Select
              allowClear
              placeholder="全部股票"
              value={selectedStockForStrategy}
              onChange={setSelectedStockForStrategy}
              options={[
                ...stocks.map(stock => ({
                  value: stock.symbol,
                  label: `${stock.symbol} (${stock.name})`
                }))
              ]}
            />
          </Form.Item>
          <Form.Item label="买入策略 (%) ">
            <InputNumber
              min={1}
              max={50}
              value={buyStrategyPercent}
              onChange={setBuyStrategyPercent}
            />
          </Form.Item>
          <Form.Item label="卖出策略 (%) ">
            <InputNumber
              min={1}
              max={50}
              value={sellStrategyPercent}
              onChange={setSellStrategyPercent}
            />
          </Form.Item>
          <Form.Item label="计算组数">
            <InputNumber
              min={1}
              max={10}
              value={groupsNumber}
              onChange={setGroupsNumber}
            />
          </Form.Item>
          <Button type="primary" onClick={calculateStrategy}>计算</Button>
        </Form>
      </Card>

      {/* 策略结果表格 */}
      <Table
        dataSource={strategyResults}
        rowKey="key"
        columns={[
          { title: '股票名称', dataIndex: 'name' },
          {
            title: '成本基准',
            dataIndex: 'costPrice',
            render: value => `$${value.toFixed(2)}`
          },
          { title: '组别', dataIndex: 'group' },
          { 
            title: '买入价格', 
            dataIndex: 'buyPrice',
            render: value => `$${value.toFixed(2)}`
          },
          {
            title: '卖出价格',
            dataIndex: 'sellPrice',
            render: value => `$${value.toFixed(2)}`
          }
        ]}
        pagination={false}
      />

      {/* 操作记录列表 */}
      <Card 
        title="操作记录" 
        className="table-card"
        extra={
          <span>
            <HistoryOutlined /> 最近操作
          </span>
        }
      >
        <Table 
          dataSource={operationLogs} 
          columns={logColumns} 
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: '暂无操作记录' }}
          rowKey="key"
        />
      </Card>

      {/* 盈利统计模块 */}
      <Card title="股票盈利统计" className="table-card">
        <Table
          title={() => '累计盈利统计'}
          dataSource={Object.values(profitStats)}
          rowKey="symbol"
          columns={[
            { title: '股票代码', dataIndex: 'symbol' },
            {
              title: '累计盈利',
              dataIndex: 'totalProfit',
              render: value => (
                <span style={{ color: value >= 0 ? '#3f8600' : '#cf1322' }}>
                  ${value.toFixed(2)}
                </span>
              )
            }
          ]}
          pagination={false}
          style={{ marginBottom: 24 }}
        />

        <div style={{ marginBottom: 16 }}>
          <Select
            placeholder="选择月份"
            style={{ width: 200 }}
            value={selectedMonth}
            onChange={setSelectedMonth}
            options={[
              ...new Set(Object.values(monthlyProfitStats).map(m => m.month))
            ].sort().map(month => ({ value: month, label: month }))}
          />
        </div>
        <Table
          title={() => '月度盈利统计'}
          dataSource={Object.values(monthlyProfitStats).filter(m => !selectedMonth || m.month === selectedMonth)}
          rowKey={record => `${record.symbol}-${record.month}`}
          columns={[
            { title: '股票代码', dataIndex: 'symbol' },
            {
              title: '盈利金额',
              dataIndex: 'profit',
              render: value => (
                <span style={{ color: value >= 0 ? '#3f8600' : '#cf1322' }}>
                  ${value.toFixed(2)}
                </span>
              )
            }
          ]}
          pagination={false}
        />
      </Card>



      {/* 卖出股票对话框 */}
      <Modal
        title="卖出股票"
        open={sellModalVisible}
        onOk={handleSell}
        onCancel={() => {
          setSellModalVisible(false);
          sellForm.resetFields();
        }}
      >
        <Form
          form={sellForm}
          layout="vertical"
        >
          <Form.Item
            label="卖出数量"
            name="quantity"
            rules={[{ required: true, message: '请输入卖出数量' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="请输入卖出数量"
              disabled={selectedStock?.isFromDetails} // 如果是从详情页面卖出，则禁用数量输入
            />
          </Form.Item>
          <Form.Item
            label="卖出价格"
            name="sellPrice"
            rules={[{ required: true, message: '请输入卖出价格' }]}
          >
            <InputNumber
              min={0.01}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="请输入卖出价格"
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="追加买入"
        open={addPurchaseModalVisible}
        onCancel={() => setAddPurchaseModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setAddPurchaseModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleAddPurchase}>
            确认追加
          </Button>,
        ]}
      >
        <Form form={addPurchaseForm} layout="vertical">
          <Form.Item
            label="追加数量"
            name="quantity"
            rules={[{ required: true, message: '请输入追加数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="买入价格"
            name="costPrice"
            rules={[{ required: true, message: '请输入买入价格' }]}
          >
            <InputNumber
              min={0.01}
              precision={2}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
      



      {/* 股票详情对话框 */}
      <Modal
        title={selectedStockDetails ? `${selectedStockDetails.name}(${selectedStockDetails.symbol}) 买入记录` : '买入记录'}
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        <List
          dataSource={purchaseRecords}
          locale={{ emptyText: '暂无买入记录' }}
          renderItem={item => (
            <List.Item
              key={item.key}
              actions={[
                <Button 
                  type="primary" 
                  icon={<ShoppingOutlined />}
                  onClick={() => handleSellFromDetails(item)}
                >
                  卖出
                </Button>,
                <Button 
                  type="primary" 
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteRecordClick(item)}
                >
                  删除
                </Button>
              ]}
            >
              <List.Item.Meta
                title={`${item.type === '新增股票' ? '首次买入' : '追加买入'} - ${item.timestamp}`}
                description={`买入数量: ${item.quantity}股, 买入价格: $${item.price.toFixed(2)}, 总投入: $${(item.quantity * item.price).toFixed(2)}`}
              />
            </List.Item>
          )}
        />
      </Modal>
      
      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        open={deleteConfirmVisible}
        onOk={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmVisible(false);
          setRecordToDelete(null);
        }}
        okText="确认删除"
        cancelText="取消"
      >
        <p>确定要删除这条记录吗？删除后将不会在详情页面显示，但在操作记录中仍会保留。</p>
        {recordToDelete && (
          <div>
            <p><strong>记录信息：</strong></p>
            <p>类型：{recordToDelete.type === '新增股票' ? '首次买入' : '追加买入'}</p>
            <p>时间：{recordToDelete.timestamp}</p>
            <p>数量：{recordToDelete.quantity}股</p>
            <p>价格：${recordToDelete.price.toFixed(2)}</p>
            <p>总投入：${(recordToDelete.quantity * recordToDelete.price).toFixed(2)}</p>
          </div>
        )}
      </Modal>
      
    </div>
  )
}

export default App
