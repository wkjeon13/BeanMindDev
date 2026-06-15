package com.beanmind.curator;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class CuratorApplication {

	public static void main(String[] args) {
		SpringApplication.run(CuratorApplication.class, args);
	}

}
