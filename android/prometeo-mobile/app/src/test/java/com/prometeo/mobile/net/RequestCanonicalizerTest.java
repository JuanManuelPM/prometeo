package com.prometeo.mobile.net;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class RequestCanonicalizerTest {
    @Test
    public void hashesExactBodyBytes() throws Exception {
        assertEquals(
                "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
                RequestCanonicalizer.sha256Hex("{}")
        );
    }

    @Test
    public void canonicalShapeIsStable() throws Exception {
        String value = RequestCanonicalizer.canonical(
                "1790222400",
                "abcdefghijklmnop",
                "{}"
        );

        assertTrue(value.startsWith(
                "prometeo.mobile.request/v1\nPOST\n/functions/v1/prometeo-mobile-v1\n"
        ));
        assertTrue(value.endsWith(
                "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a"
        ));
        assertEquals(6, value.split("\n", -1).length);
    }
}
