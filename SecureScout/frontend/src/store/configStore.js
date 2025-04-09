import { defineStore } from 'pinia'
import { configApi } from '../api'

export const useConfigStore = defineStore('config', {
  state: () => ({
    config: null,
    vulnerabilityLibrary: null,
    isLoading: false,
    error: null
  }),
  
  actions: {
    // 获取配置
    async fetchConfig() {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.config = await configApi.getConfig();
        return this.config;
      } catch (err) {
        this.error = err.message || '获取配置失败';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },
    
    // 更新配置
    async updateConfig(configData) {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.config = await configApi.updateConfig(configData);
        return this.config;
      } catch (err) {
        this.error = err.message || '更新配置失败';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },
    
    // 获取漏洞库
    async fetchVulnerabilityLibrary() {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.vulnerabilityLibrary = await configApi.getVulnerabilityLibrary();
        return this.vulnerabilityLibrary;
      } catch (err) {
        this.error = err.message || '获取漏洞库失败';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },
    
    // 更新漏洞规则
    async updateVulnerabilityRule(vulnType, ruleData) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const updatedRule = await configApi.updateVulnerabilityRule(vulnType, ruleData);
        
        // 更新本地状态
        if (this.vulnerabilityLibrary) {
          this.vulnerabilityLibrary[vulnType] = updatedRule;
        }
        
        return updatedRule;
      } catch (err) {
        this.error = err.message || '更新漏洞规则失败';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },
    
    // 重置配置
    async resetConfig() {
      this.isLoading = true;
      this.error = null;
      
      try {
        this.config = await configApi.resetConfig();
        return this.config;
      } catch (err) {
        this.error = err.message || '重置配置失败';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },
    
    // 清除错误
    clearError() {
      this.error = null;
    }
  }
}) 