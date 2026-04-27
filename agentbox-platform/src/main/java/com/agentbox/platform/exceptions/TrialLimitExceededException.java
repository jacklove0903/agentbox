package com.agentbox.platform.exceptions;

public class TrialLimitExceededException extends RuntimeException {

    private final String feature;
    private final int limit;
    private final int used;
    private final int remaining;

    public TrialLimitExceededException(String feature, int limit, int used, int remaining) {
        super("试用次数已用完，请登录后继续使用");
        this.feature = feature;
        this.limit = limit;
        this.used = used;
        this.remaining = remaining;
    }

    public String getFeature() {
        return feature;
    }

    public int getLimit() {
        return limit;
    }

    public int getUsed() {
        return used;
    }

    public int getRemaining() {
        return remaining;
    }
}
